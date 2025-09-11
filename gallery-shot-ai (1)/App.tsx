import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { ProcessingState } from './types';
import { transformArtwork, analyzeArtwork, ArtworkAnalysis, GroundingChunk } from './services/geminiService';

type ProcessedImage = {
  id: string;
  file: File;
  originalSrc: string;
  processedSrcs: string[] | null;
  error: string | null;
};

type AnalysisResult = {
  analysis: ArtworkAnalysis | null;
  sources: GroundingChunk[] | null;
  error: string | null;
};

const fileToBase64 = (file: File): Promise<{ base64: string; mimeType: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      const mimeType = result.split(',')[0].split(':')[1].split(';')[0];
      resolve({ base64, mimeType });
    };
    reader.onerror = (error) => reject(error);
  });
};

// --- ICONS ---
const UploadIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M12 15l-4-4m4 4l4-4m-4-4v12" />
  </svg>
);
const DownloadIcon: React.FC<{ className?: string }> = ({ className = '' }) => ( <svg xmlns="http://www.w3.org/2000/svg" className={`h-7 w-7 text-white ${className}`} viewBox="0 0 20 20" fill="currentColor"> <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /> </svg> );
const ClipboardIcon: React.FC<{ className?: string }> = ({ className = "h-5 w-5" }) => ( <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg> );
const PriceIcon: React.FC<{ className?: string }> = ({ className = "h-6 w-6" }) => ( <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8a1 1 0 011 1v1m-2-2a1 1 0 011-1h1a1 1 0 011 1m-3 6a1 1 0 011-1h1a1 1 0 011 1m0 0a1 1 0 01-1 1h-1a1 1 0 01-1-1z" /><path d="M12 18.75a6.375 6.375 0 006.375-6.375V12a6.375 6.375 0 00-6.375-6.375H12A6.375 6.375 0 005.625 12v.375A6.375 6.375 0 0012 18.75z" /></svg>);
const ReportIcon: React.FC<{ className?: string }> = ({ className = "h-6 w-6" }) => ( <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> );
const ListingIcon: React.FC<{ className?: string }> = ({ className = "h-6 w-6" }) => ( <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg> );
const LinkIcon: React.FC<{ className?: string }> = ({ className = "h-5 w-5" }) => ( <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg> );


// --- UI Components ---

const Header: React.FC = () => (
  <header className="text-center p-4 md:p-6">
    <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-indigo-500">
      Gallery Shot AI
    </h1>
    <p className="text-slate-400 mt-2 text-lg">
      From photo to gallery to sale. Create, analyze, and list your art.
    </p>
  </header>
);

interface UploadAreaProps {
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  isProcessing: boolean;
  artworkDescription: string;
  setArtworkDescription: (value: string) => void;
}

const UploadArea: React.FC<UploadAreaProps> = ({ onFileChange, isProcessing, artworkDescription, setArtworkDescription }) => (
  <div className="w-full max-w-2xl text-center space-y-6">
     <textarea
      value={artworkDescription}
      onChange={(e) => setArtworkDescription(e.target.value)}
      disabled={isProcessing}
      placeholder="FLORIDA XX. CLAUDIO SCHEFFER OLEO SOBRE CARTON, FIRMADO ABAJO A LA IZQUIERDA Y DEDICADO POR DETRAS..."
      className="w-full bg-slate-800 border-2 border-slate-600 rounded-lg p-4 text-slate-300 placeholder-slate-500 focus:ring-2 focus:ring-teal-400 focus:border-teal-400 transition duration-300"
      rows={4}
      aria-label="Artwork Description"
    />
    <label htmlFor="file-upload" className="cursor-pointer block border-2 border-dashed border-slate-600 hover:border-teal-400 transition-colors duration-300 rounded-lg p-10 md:p-12">
      <div className="flex flex-col items-center justify-center">
        <UploadIcon />
        <p className="mt-4 text-xl font-semibold text-slate-300">
          Drag & drop your artwork or click to upload
        </p>
        <p className="mt-1 text-sm text-slate-500">PNG, JPG, or WEBP (Multiple files accepted)</p>
      </div>
      <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={onFileChange} disabled={isProcessing} accept="image/png, image/jpeg, image/webp" multiple />
    </label>
  </div>
);

const PROCESSING_MESSAGES = ["Framing your masterpieces...", "Consulting with art historians...", "Adjusting the gallery lighting...", "Analyzing market data...", "Hanging your art on the virtual walls...", "Polishing the camera lens...", "Curating the perfect scenes...", "Compiling the appraisal report...", "Almost ready for the grand reveal..."];

const ProcessingView: React.FC = () => {
    const [message, setMessage] = useState(PROCESSING_MESSAGES[0]);
    useEffect(() => {
        const intervalId = setInterval(() => { setMessage(prev => { const currentIndex = PROCESSING_MESSAGES.indexOf(prev); const nextIndex = (currentIndex + 1) % PROCESSING_MESSAGES.length; return PROCESSING_MESSAGES[nextIndex]; }); }, 2500);
        return () => clearInterval(intervalId);
    }, []);
    return (
        <div className="flex flex-col items-center justify-center text-center p-8">
             <div className="w-16 h-16 border-4 border-teal-400 border-dashed rounded-full animate-spin"></div>
            <p className="mt-6 text-xl text-slate-300 font-medium transition-opacity duration-500">{message}</p>
        </div>
    );
};

const GeneratedShot: React.FC<{ src: string; fileName: string; index: number }> = ({ src, fileName, index }) => (
    <div className="relative group aspect-square bg-slate-700/50 rounded-md overflow-hidden">
      <img src={src} alt={`Generated shot ${index + 1}`} className="w-full h-full object-contain" />
      <a href={src} download={`gallery-shot-${fileName.replace(/\.[^/.]+$/, "")}-${index + 1}.png`} className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100" aria-label={`Download shot ${index + 1}`}><DownloadIcon /></a>
    </div>
);

const CopyButton: React.FC<{ textToCopy: string }> = ({ textToCopy }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        navigator.clipboard.writeText(textToCopy);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return <button onClick={handleCopy} className="text-slate-400 hover:text-white transition-colors p-1" aria-label="Copy to clipboard"><ClipboardIcon className={`h-5 w-5 ${copied ? 'text-teal-400' : ''}`} /></button>;
};

const AnalysisSection: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
    <div className="space-y-3">
        <div className="flex items-center space-x-3">
            <div className="text-teal-400">{icon}</div>
            <h4 className="text-lg font-bold text-slate-200">{title}</h4>
        </div>
        <div>{children}</div>
    </div>
);

const ImageSetItem: React.FC<{ image: ProcessedImage }> = ({ image }) => (
    <div className="bg-slate-800 p-4 rounded-lg shadow-lg space-y-4">
        <h4 className="text-sm font-semibold text-slate-400 text-center" title={image.file.name}>Original: {image.file.name}</h4>
        <div className="grid grid-cols-2 gap-2">
            <div className="aspect-square bg-slate-700/50 rounded-md flex items-center justify-center p-2">
                <img src={image.originalSrc} alt="Original artwork" className="max-w-full max-h-full object-contain rounded-sm" />
            </div>
             {image.processedSrcs && image.processedSrcs.length > 0 ? (
                 <div className="grid grid-cols-2 gap-1">
                    {image.processedSrcs.slice(0, 3).map((src, index) => <GeneratedShot key={index} src={src} fileName={image.file.name} index={index} />)}
                 </div>
            ) : (
                 <div className="p-4 text-center text-red-400 text-sm flex items-center justify-center aspect-square bg-slate-700/50 rounded-md">Failed to generate images.</div>
            )}
        </div>
         {image.error && <div className="p-2 bg-red-900/50 text-red-300 text-xs rounded-md text-center"><p>{image.error}</p></div>}
    </div>
);


const AnalysisPanel: React.FC<{ result: AnalysisResult }> = ({ result }) => (
    <div className="bg-slate-800 rounded-lg shadow-xl p-6 space-y-6 h-fit sticky top-8">
        <h3 className="text-2xl font-bold text-slate-200 text-center">Artwork Analysis</h3>
        {result.analysis ? (
            <div className="space-y-6">
                <AnalysisSection icon={<PriceIcon />} title="Estimated Price">
                    <p className="text-2xl font-mono bg-slate-700/50 rounded-md px-4 py-2 text-teal-300">{result.analysis.estimatedPrice}</p>
                </AnalysisSection>

                <AnalysisSection icon={<ReportIcon />} title="Pricing Report">
                    <p className="text-slate-400 text-sm whitespace-pre-wrap leading-relaxed">{result.analysis.priceReasoning}</p>
                </AnalysisSection>

                <AnalysisSection icon={<ListingIcon />} title="Ready-to-Use Listing">
                    <div className="space-y-3">
                        <div>
                            <div className="flex justify-between items-center">
                                <h5 className="text-sm font-semibold text-slate-300">Title</h5>
                                <CopyButton textToCopy={result.analysis.advertisementTitle} />
                            </div>
                            <p className="text-sm bg-slate-700/50 p-3 rounded-md text-slate-300">{result.analysis.advertisementTitle}</p>
                        </div>
                        <div>
                             <div className="flex justify-between items-center">
                                <h5 className="text-sm font-semibold text-slate-300">Body</h5>
                                <CopyButton textToCopy={result.analysis.advertisementBody} />
                            </div>
                            <p className="text-sm bg-slate-700/50 p-3 rounded-md text-slate-400 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">{result.analysis.advertisementBody}</p>
                        </div>
                    </div>
                </AnalysisSection>
                
                {result.sources && result.sources.length > 0 && (
                    <AnalysisSection icon={<LinkIcon />} title="Sources">
                        <ul className="space-y-2 text-sm max-h-32 overflow-y-auto">
                            {result.sources.map((source, index) => (
                                <li key={index}>
                                    <a href={source.web.uri} target="_blank" rel="noopener noreferrer" className="text-teal-400 hover:text-teal-300 truncate block transition-colors" title={source.web.uri}>
                                        {source.web.title || source.web.uri}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </AnalysisSection>
                )}
            </div>
        ) : (
            <div className="p-4 text-center text-red-400 text-sm flex flex-col items-center justify-center h-full">
                <p>Failed to generate analysis.</p>
                {result.error && <p className="mt-2 text-xs text-red-500">{result.error}</p>}
            </div>
        )}
    </div>
);

const ResultsView: React.FC<{ analysisResult: AnalysisResult | null; processedImages: ProcessedImage[]; onReset: () => void }> = ({ analysisResult, processedImages, onReset }) => (
    <div className="w-full max-w-7xl animate-fade-in mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8 px-4 sm:px-0">
            <h1 className="text-3xl font-bold text-slate-200 mb-4 sm:mb-0">Your Gallery Analysis</h1>
            <button onClick={onReset} className="inline-flex items-center justify-center px-6 py-3 border border-slate-600 text-base font-medium rounded-md text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors duration-300 w-full sm:w-auto">Analyze Another Artwork</button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {analysisResult && <AnalysisPanel result={analysisResult} />}
            <div className="space-y-6">
                 <h3 className="text-2xl font-bold text-slate-200 text-center lg:text-left">Generated Images</h3>
                {processedImages.map(image => <ImageSetItem key={image.id} image={image} />)}
            </div>
        </div>
    </div>
);


const App: React.FC = () => {
  const [processedImages, setProcessedImages] = useState<ProcessedImage[]>([]);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [artworkDescription, setArtworkDescription] = useState('');
  const [processingState, setProcessingState] = useState<ProcessingState>(ProcessingState.IDLE);
  
  const isProcessing = useMemo(() => processingState === ProcessingState.PROCESSING, [processingState]);

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files) : [];
    if (files.length === 0) return;

    setProcessingState(ProcessingState.PROCESSING);
    
    const initialImages: ProcessedImage[] = files.map(file => ({
      id: crypto.randomUUID(), file, originalSrc: URL.createObjectURL(file),
      processedSrcs: null, error: null,
    }));
    setProcessedImages(initialImages);
    setAnalysisResult(null);

    // --- Create all promises ---
    const analysisPromise = (async () => {
        const { base64, mimeType } = await fileToBase64(files[0]);
        return analyzeArtwork(base64, mimeType, artworkDescription);
    })();

    const imageTransformPromises = initialImages.map(async (image) => {
        const { base64, mimeType } = await fileToBase64(image.file);
        const transformed = await transformArtwork(base64, mimeType);
        return {
            id: image.id,
            processedSrcs: transformed.map(b64 => `data:image/png;base64,${b64}`)
        };
    });

    // --- Settle all promises ---
    const [analysisSettledResult, ...imageSettledResults] = await Promise.allSettled([
        analysisPromise, 
        ...imageTransformPromises
    ]);
    
    // --- Process analysis result ---
    const finalAnalysis: AnalysisResult = { analysis: null, sources: null, error: null };
    if (analysisSettledResult.status === 'fulfilled') {
        const { analysis, sources } = analysisSettledResult.value as { analysis: ArtworkAnalysis; sources: GroundingChunk[] };
        finalAnalysis.analysis = analysis;
        finalAnalysis.sources = sources;
    } else {
        finalAnalysis.error = analysisSettledResult.reason instanceof Error ? analysisSettledResult.reason.message : "Artwork analysis failed.";
    }
    setAnalysisResult(finalAnalysis);

    // --- Process image results ---
    const finalImages = initialImages.map(image => {
        const correspondingResult = imageSettledResults.find(res => res.status === 'fulfilled' && res.value.id === image.id);
        if (correspondingResult && correspondingResult.status === 'fulfilled') {
            return { ...image, processedSrcs: correspondingResult.value.processedSrcs, error: null };
        } else {
            // Find the reason for failure if it exists
             const failedResult = imageSettledResults.find((res, index) => initialImages[index].id === image.id && res.status === 'rejected');
             const errorMsg = failedResult && failedResult.status === 'rejected' && failedResult.reason instanceof Error 
                ? failedResult.reason.message 
                : "Image generation failed.";
            return { ...image, processedSrcs: null, error: errorMsg };
        }
    });
    setProcessedImages(finalImages);

    const hasSuccess = finalAnalysis.analysis || finalImages.some(img => img.processedSrcs);
    setProcessingState(hasSuccess ? ProcessingState.SUCCESS : ProcessingState.ERROR);

  }, [artworkDescription]);

  const handleReset = useCallback(() => {
    processedImages.forEach(img => URL.revokeObjectURL(img.originalSrc));
    setProcessedImages([]);
    setAnalysisResult(null);
    setArtworkDescription('');
    setProcessingState(ProcessingState.IDLE);
  }, [processedImages]);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 flex flex-col items-center justify-center font-sans p-4">
      <div className="w-full max-w-7xl flex flex-col items-center justify-center flex-grow">
        {processingState === ProcessingState.IDLE && <Header />}
        <main className="flex-grow flex flex-col items-center justify-center w-full mt-4 md:mt-8">
          {processingState === ProcessingState.IDLE && (
            <UploadArea onFileChange={handleFileChange} isProcessing={isProcessing} artworkDescription={artworkDescription} setArtworkDescription={setArtworkDescription} />
          )}
          {processingState === ProcessingState.PROCESSING && <ProcessingView />}
          {(processingState === ProcessingState.SUCCESS || processingState === ProcessingState.ERROR) && (analysisResult || processedImages.length > 0) && (
            <ResultsView analysisResult={analysisResult} processedImages={processedImages} onReset={handleReset} />
          )}
        </main>
      </div>
      <footer className="w-full text-center p-4 mt-8">
        <p className="text-slate-500 text-sm">Powered by Gemini</p>
      </footer>
    </div>
  );
};

export default App;

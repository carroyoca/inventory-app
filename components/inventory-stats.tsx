"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, DollarSign, CheckCircle, Clock } from "lucide-react"

interface InventoryItem {
  id: string
  status: string
  estimated_price: number | null
  sale_price: number | null
}

interface InventoryStatsProps {
  items: InventoryItem[]
}

export function InventoryStats({ items }: InventoryStatsProps) {
  const totalItems = items.length
  const availableItems = items.filter((item) => item.status === "available").length
  const soldItems = items.filter((item) => item.status === "sold").length
  const reservedItems = items.filter((item) => item.status === "reserved").length

  const totalEstimatedValue = items.reduce((sum, item) => {
    return sum + (item.estimated_price || 0)
  }, 0)

  const totalSaleValue = items.reduce((sum, item) => {
    return sum + (item.sale_price || 0)
  }, 0)

  const stats = [
    {
      title: "Total Items",
      value: totalItems.toString(),
      icon: Package,
      color: "text-blue-600",
    },
    {
      title: "Available",
      value: availableItems.toString(),
      icon: CheckCircle,
      color: "text-green-600",
    },
    {
      title: "Sold",
      value: soldItems.toString(),
      icon: DollarSign,
      color: "text-purple-600",
    },
    {
      title: "Reserved",
      value: reservedItems.toString(),
      icon: Clock,
      color: "text-orange-600",
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat) => {
        const Icon = stat.icon
        return (
          <Card key={stat.title} className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">{stat.title}</p>
                  <div className="text-3xl font-bold text-gray-900">{stat.value}</div>
                </div>
                <div className={`p-3 rounded-xl ${
                  stat.title === "Total Items" ? "bg-blue-100" :
                  stat.title === "Available" ? "bg-green-100" :
                  stat.title === "Sold" ? "bg-purple-100" :
                  "bg-orange-100"
                }`}>
                  <Icon className={`h-6 w-6 ${
                    stat.title === "Total Items" ? "text-blue-600" :
                    stat.title === "Available" ? "text-green-600" :
                    stat.title === "Sold" ? "text-purple-600" :
                    "text-orange-600"
                  }`} />
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}

      {/* Value Cards */}
      <Card className="md:col-span-2 bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Valor de la Colección</p>
              <div className="text-2xl font-bold text-gray-900">${totalEstimatedValue.toLocaleString()}</div>
            </div>
            <div className="p-3 bg-gradient-to-br from-purple-100 to-blue-100 rounded-xl">
              <DollarSign className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Valor Estimado:</span>
              <span className="font-semibold text-gray-900">${totalEstimatedValue.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Valor de Venta:</span>
              <span className="font-semibold text-gray-900">${totalSaleValue.toLocaleString()}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

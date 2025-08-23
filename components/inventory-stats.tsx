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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon
        return (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">{stat.title}</CardTitle>
              <Icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        )
      })}

      {/* Value Cards */}
      <Card className="md:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">Collection Value</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Estimated Value:</span>
              <span className="font-medium">${totalEstimatedValue.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Sale Value:</span>
              <span className="font-medium">${totalSaleValue.toLocaleString()}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

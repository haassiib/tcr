import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  ShoppingCart,
  Activity,
  Download,
  Filter,
  MoreHorizontal
} from 'lucide-react'
import { cn } from '@/lib/utils/clsx'

export default async function DashboardPage() {
  const stats = [
    {
      name: 'Total Revenue',
      value: '$45,231.89',
      change: '+20.1%',
      changeType: 'positive',
      icon: DollarSign,
      color: 'bg-green-500'
    },
    {
      name: 'Subscribers',
      value: '+2350',
      change: '+180.1%',
      changeType: 'positive',
      icon: Users,
      color: 'bg-blue-500'
    },
    {
      name: 'Sales',
      value: '+12,234',
      change: '+19%',
      changeType: 'positive',
      icon: ShoppingCart,
      color: 'bg-orange-500'
    },
    {
      name: 'Active Now',
      value: '573',
      change: '+201 since last hour',
      changeType: 'positive',
      icon: Activity,
      color: 'bg-purple-500'
    }
  ]

  const recentTransactions = [
    { id: 1, name: 'Payment from #00992', date: 'Apr 23, 2021', amount: '$2,000', status: 'Completed' },
    { id: 2, name: 'Payment from #00991', date: 'Apr 23, 2021', amount: '$1,500', status: 'Pending' },
    { id: 3, name: 'Payment from #00990', date: 'Apr 22, 2021', amount: '$4,000', status: 'Completed' },
    { id: 4, name: 'Payment from #00989', date: 'Apr 22, 2021', amount: '$800', status: 'Completed' },
  ]

  const topProducts = [
    { name: 'Abstract 3D', sales: '$20,000', stock: '32 in stock', price: '$45.99' },
    { name: 'Sarphens Illustration', sales: '$10,000', stock: '32 in stock', price: '$45.99' },
    { name: 'Patterns & Shapes', sales: '$8,000', stock: '32 in stock', price: '$45.99' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <div className="flex gap-3">
          <button className={cn(
            "flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium",
            "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
          )}>
            <Download className="w-4 h-4 mr-2" />
            Download
          </button>
          <button className={cn(
            "flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium",
            "hover:bg-blue-700 transition-colors duration-200"
          )}>
            <Filter className="w-4 h-4 mr-2" />
            Add Filter
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.name} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{stat.name}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stat.value}</p>
                  <p className={cn(
                    "text-sm mt-1",
                    stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                  )}>
                    {stat.change}
                  </p>
                </div>
                <div className={cn("rounded-lg p-3", stat.color)}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Charts & Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Revenue</h3>
            <select className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>This Week</option>
              <option>This Month</option>
              <option>This Year</option>
            </select>
          </div>
          <div className="flex items-end gap-2 h-32">
            {[40, 80, 60, 90, 70, 100, 80].map((height, index) => (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div 
                  className="w-full bg-gradient-to-t from-blue-500 to-blue-600 rounded-t-lg transition-opacity duration-300 hover:opacity-80"
                  style={{ height: `${height}%` }}
                />
                <span className="text-xs text-gray-500 mt-2">Day {index + 1}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Transactions</h3>
            <button className="text-sm text-blue-600 hover:text-blue-700 transition-colors duration-200">
              View All
            </button>
          </div>
          <div className="space-y-4">
            {recentTransactions.map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{transaction.name}</p>
                  <p className="text-sm text-gray-500">{transaction.date}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900 dark:text-white">{transaction.amount}</p>
                  <span className={cn(
                    "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                    transaction.status === 'Completed' 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                      : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                  )}>
                    {transaction.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Products */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Top Products</h3>
          <button className="text-sm text-blue-600 hover:text-blue-700 transition-colors duration-200">
            View All
          </button>
        </div>
        <div className="space-y-4">
          {topProducts.map((product, index) => (
            <div key={index} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{product.name}</p>
                  <p className="text-sm text-gray-500">{product.stock}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium text-gray-900 dark:text-white">{product.sales}</p>
                <p className="text-sm text-gray-500">{product.price}</p>
              </div>
              <button className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200">
                <MoreHorizontal className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
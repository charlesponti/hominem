import { BarChart3, Calculator, FolderOpen, PieChart, Target, TrendingUp } from 'lucide-react'
import { Link, Outlet, useLocation } from 'react-router'
import { cn } from '~/lib/utils'

const navigationItems = [
  {
    title: 'Dashboard',
    href: '/budget/dashboard',
    icon: PieChart,
    description: 'Overview and projections',
  },
  {
    title: 'Impact Calculator',
    href: '/budget',
    icon: Calculator,
    description: 'Analyze purchase impacts',
  },
  {
    title: 'Budget Tracking',
    href: '/budget/tracking',
    icon: BarChart3,
    description: 'Budget vs actual spending',
  },
  {
    title: 'Categories',
    href: '/budget/categories',
    icon: FolderOpen,
    description: 'Manage budget categories',
  },
]

export default function BudgetLayout() {
  const location = useLocation()

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col">
        <div className="flex flex-col flex-grow pt-5 overflow-y-auto bg-white border-r">
          <div className="flex items-center flex-shrink-0 px-4">
            <Target className="h-8 w-8 text-blue-600" />
            <h1 className="ml-2 text-xl font-bold text-gray-900">Budget Manager</h1>
          </div>

          <div className="mt-8 flex-grow flex flex-col">
            <nav className="flex-1 px-2 space-y-1">
              {navigationItems.map((item) => {
                const isActive = location.pathname === item.href
                const Icon = item.icon

                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={cn(
                      'group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors',
                      isActive
                        ? 'bg-blue-100 text-blue-900'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    )}
                  >
                    <Icon
                      className={cn(
                        'mr-3 flex-shrink-0 h-5 w-5',
                        isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                      )}
                    />
                    <div className="flex-1">
                      <div className="font-medium">{item.title}</div>
                      <div className={cn('text-xs', isActive ? 'text-blue-700' : 'text-gray-500')}>
                        {item.description}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </nav>

            <div className="p-4 border-t">
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="flex items-center">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  <span className="ml-2 text-sm font-medium text-blue-900">Budget Tips</span>
                </div>
                <p className="mt-2 text-xs text-blue-700">
                  Aim for a 20% savings rate and track your progress monthly.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile navigation */}
      <div className="md:hidden">
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2">
          <div className="flex justify-around">
            {navigationItems.map((item) => {
              const isActive = location.pathname === item.href
              const Icon = item.icon

              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    'flex flex-col items-center px-2 py-1 rounded-md transition-colors',
                    isActive ? 'text-blue-600' : 'text-gray-600'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-xs mt-1 font-medium">{item.title.split(' ')[0]}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-6 px-4 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

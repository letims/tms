export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="animate-spin">
        <div className="h-8 w-8 border-4 border-blue-200 border-t-blue-600 rounded-full"></div>
      </div>
    </div>
  )
}

export function SkeletonRow() {
  return (
    <tr className="border-b border-gray-200 bg-gray-50">
      <td colSpan={4} className="px-6 py-4">
        <div className="flex gap-4">
          <div className="h-4 bg-gray-300 rounded w-1/4 animate-pulse"></div>
          <div className="h-4 bg-gray-300 rounded w-1/4 animate-pulse"></div>
          <div className="h-4 bg-gray-300 rounded w-1/4 animate-pulse"></div>
        </div>
      </td>
    </tr>
  )
}

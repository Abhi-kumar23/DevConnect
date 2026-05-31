const PostSkeleton = () => (
    <div className="bg-white rounded-xl shadow-sm border p-4 animate-pulse">
        <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
            <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-24"></div>
            </div>
        </div>
        <div className="h-20 bg-gray-200 rounded mb-4"></div>
        <div className="flex justify-around">
            <div className="h-8 bg-gray-200 rounded w-16"></div>
            <div className="h-8 bg-gray-200 rounded w-16"></div>
        </div>
    </div>
);
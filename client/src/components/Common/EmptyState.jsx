const EmptyState = ({ icon: Icon, title, description, action }) => (
  <div className="card text-center py-12 px-6">
    {Icon && (
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
        <Icon size={26} />
      </div>
    )}
    <h3 className="text-lg font-bold text-slate-900">{title}</h3>
    {description && <p className="mt-1.5 text-sm text-slate-500 max-w-sm mx-auto">{description}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>
)

export default EmptyState

'use client'

export default function EmptyState({ icon: Icon, title, description, actionText, onAction }) {
  return (
    <div className="card text-center py-10 fade-in">
      {Icon ? <Icon className="h-12 w-12 text-primary-300 mx-auto mb-4" /> : null}
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      <p className="text-gray-600 mt-2">{description}</p>
      {actionText && onAction ? (
        <button onClick={onAction} className="btn-primary mt-5">
          {actionText}
        </button>
      ) : null}
    </div>
  )
}

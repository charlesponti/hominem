interface AuthScaffoldProps {
  children: React.ReactNode;
  title: string;
  description?: string;
  logo?: string;
  className?: string;
}

export function AuthScaffold({ children, title, description, logo, className }: AuthScaffoldProps) {
  return (
    <div
      className={`min-h-screen flex items-center justify-center bg-bg-base p-4 ${className ?? ''}`}
    >
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          {logo ? (
            <img src={logo} alt="" className="w-24 h-24 mx-auto mb-4 object-contain" />
          ) : (
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-md bg-bg-elevated border border-default mb-4" />
          )}
          <h1 className="heading-2 text-text-primary uppercase">{title}</h1>
          {description && <p className="body-3 text-text-secondary mt-2">{description}</p>}
        </div>

        <div className="bg-bg-surface border border-default rounded-md p-4">{children}</div>
      </div>
    </div>
  );
}

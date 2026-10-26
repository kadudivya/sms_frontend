// Split layout used by sign-in, registration and invitation screens.
export default function AuthLayout({ title, subtitle, children, wide }) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <section className="flex flex-col justify-between gap-10 bg-brand-ink px-8 py-10 text-white lg:w-[42%] lg:px-14 lg:py-14">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-sm font-bold text-brand-ink">SM</div>
          <strong>Student Migration System</strong>
        </div>
        <div className="max-w-md">
          <h2 className="text-3xl font-bold leading-tight lg:text-4xl">Move between colleges and universities without the paperwork chase.</h2>
          <p className="mt-4 text-slate-300">One request carries your records, NOC, credit transfer, interview and release from start to admission.</p>
        </div>
        <p className="text-sm text-slate-400">For students, colleges and universities across India.</p>
      </section>
      <section className="flex flex-1 items-start justify-center bg-white px-6 py-10 sm:px-10 lg:items-center">
        <div className={`w-full ${wide ? 'max-w-2xl' : 'max-w-md'}`}>
          <h1>{title}</h1>
          {subtitle && <p className="mt-2 muted">{subtitle}</p>}
          <div className="mt-7">{children}</div>
        </div>
      </section>
    </div>
  );
}

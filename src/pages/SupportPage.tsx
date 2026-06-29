function Icon({ name, className = '' }: { name: string; className?: string }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

export default function SupportPage() {
  return (
    <div className="max-w-[600px] mx-auto space-y-8">
      <section>
        <h2 className="text-headline-lg text-on-surface leading-tight">Supporto</h2>
        <p className="text-on-surface-variant text-body-lg mt-1.5">Contatta il supporto tecnico per assistenza</p>
      </section>

      <div className="bg-surface-container-lowest soft-card-shadow rounded-xl p-6 space-y-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <Icon name="mail" className="text-on-primary text-xl" />
          </div>
          <div>
            <p className="text-body-md font-semibold text-on-surface">Contatto per il supporto</p>
            <a href="mailto:lorenzo.detrizio@puglia.cri.it" className="text-body-md text-primary mt-1 block hover:underline">
              lorenzo.detrizio@puglia.cri.it
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

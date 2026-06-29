function Icon({ name, className = '' }: { name: string; className?: string }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

export default function ContactsPage() {
  return (
    <div className="max-w-[1080px] mx-auto space-y-10">
      <section className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-headline-lg text-on-surface leading-tight">Contatti</h2>
          <p className="text-on-surface-variant text-body-lg mt-1.5">Informazioni e recapiti del Comitato</p>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-surface-container-lowest soft-card-shadow rounded-xl p-6 space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <Icon name="business" className="text-on-primary text-xl" />
            </div>
            <div>
              <p className="text-body-md font-semibold text-on-surface">Sede Legale</p>
              <p className="text-body-md text-on-surface-variant mt-1">Corso Margherita di Savoia, 3<br />Molfetta (BA)</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <Icon name="mail" className="text-on-primary text-xl" />
            </div>
            <div>
              <p className="text-body-md font-semibold text-on-surface">Email</p>
              <a href="mailto:molfetta@cri.it" className="text-body-md text-primary mt-1 block hover:underline">molfetta@cri.it</a>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <Icon name="call" className="text-on-primary text-xl" />
            </div>
            <div>
              <p className="text-body-md font-semibold text-on-surface">Telefono</p>
              <a href="tel:+393341485770" className="text-body-md text-primary mt-1 block hover:underline">+39 334 148 5770</a>
            </div>
          </div>
        </div>

        <div className="bg-surface-container-lowest soft-card-shadow rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
              <Icon name="info" className="text-on-primary text-xl" />
            </div>
            <p className="text-body-md font-semibold text-on-surface">Copyright</p>
          </div>
          <p className="text-body-md text-on-surface-variant leading-relaxed">
            &copy; {new Date().getFullYear()} Croce Rossa Italiana<br />
            Comitato di Molfetta<br />
            Tutti i diritti riservati.
          </p>
        </div>
      </section>
    </div>
  )
}

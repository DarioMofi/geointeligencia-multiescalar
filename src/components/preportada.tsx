interface Props {
  abierta: boolean;
  alCerrar: () => void;
}

interface Integrante {
  nombre: string;
  correo: string;
  link?: string;
}

const INTEGRANTES: Integrante[] = [
  {
    nombre: 'Dario Molina Figueroa',
    correo: 'dariom5457@gmail.com',
    link: 'https://portafoliodario.vercel.app/',
  },
  {
    nombre: 'Ismael Kaleet Luna Aguilar',
    correo: 'ia309745@gmail.com',
    link: 'https://ia309745-ops.github.io/Perfil_profesional/',
  },
  {
    nombre: 'Manuel Emiliano Moreno Pérez',
    correo: 'emisliano974@gmail.com',
    link: 'https://manuelemilian0.github.io/perfil_profesional/',
  },
  {
    nombre: 'Joaquin Manuel Diaz Reyes',
    correo: 'jmdeconomia@gmail.com',
  },
];

export default function Preportada({ abierta, alCerrar }: Props) {
  if (!abierta) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="preportada-titulo"
      className="fixed inset-0 z-[2000] flex items-center justify-center overflow-y-auto bg-fondo/85 p-3.5 backdrop-blur-md sm:p-5"
    >
      <div className="scroll-fino relative my-auto flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-y-auto rounded-2xl border border-linea bg-superficie p-5 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] sm:p-6">
        {/* Botón discreto de cerrar en esquina superior */}
        <button
          type="button"
          onClick={alCerrar}
          aria-label="Cerrar presentación e ingresar al geovisor"
          className="absolute top-3.5 right-3.5 grid h-7 w-7 cursor-pointer place-items-center rounded-lg text-tinta-suave transition-colors hover:bg-linea hover:text-white active:scale-95"
        >
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" />
          </svg>
        </button>

        {/* Encabezado compacto */}
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-acento/30 bg-acento/15 p-1.5 shadow-inner">
            <img src="/logo.svg" alt="Logotipo Geovisor" className="h-8 w-8 object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10.5px] font-bold tracking-wider text-acento-vivo uppercase">
                Sector Automotriz
              </span>
              <span className="text-[11px] text-tinta-tenue">·</span>
              <span className="text-[11px] text-tinta-tenue">Caso de estudio: Tijuana, B.C.</span>
            </div>
            <h1 id="preportada-titulo" className="font-display text-[19px] font-bold tracking-tight text-tinta sm:text-[21px]">
              Geo Inteligencia Multiescalar
            </h1>
          </div>
        </div>

        {/* Texto en prosa explicativo */}
        <div className="mt-4 space-y-2.5 text-[13px] leading-relaxed text-tinta-suave sm:text-[13.5px]">
          <p>
            Esta plataforma de geointeligencia territorial analiza la dinámica espacial y productiva de la industria automotriz en México. A <strong className="font-semibold text-tinta">escala nacional</strong> examina el índice de crecimiento compuesto (2003–2023), los encadenamientos entre armadoras (OEM) y proveedores por niveles (Tier 1, 2 y 3), y la centralidad de las plantas en la red. A <strong className="font-semibold text-tinta">escala estatal</strong> se enfoca en Tijuana, integrando isócronas de accesibilidad hacia armadoras, distribución de unidades económicas (DENUE), equipamiento urbano, cartografía participativa en colonias e índices de vulnerabilidad urbana por AGEB.
          </p>

          <p className="text-[12.5px] text-tinta-suave">
            La fuente principal del proyecto es el{' '}
            <a
              href="https://manuelemilian0.github.io/iiec/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-acento-vivo underline decoration-acento/40 underline-offset-2 transition-colors hover:text-white"
            >
              <span>Geovisualizador del Instituto de Investigaciones Económicas (IIEc) · UNAM</span>
              <svg viewBox="0 0 16 16" className="h-3 w-3 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 3h7v7M13 3L7 9M3 6v7h7" />
              </svg>
            </a>
            .
          </p>
        </div>

        {/* Sección de integrantes */}
        <div className="mt-4 pt-3.5 border-t border-linea">
          <div className="mb-2.5 text-center">
            <span className="font-mono text-[10.5px] font-bold tracking-wider text-tinta-tenue uppercase">
              Integrantes del proyecto
            </span>
          </div>

          <div className="grid gap-2 grid-cols-2 sm:grid-cols-4">
            {INTEGRANTES.map(integrante => (
              <div
                key={integrante.nombre}
                className="flex flex-col items-center justify-between min-h-[80px] rounded-xl border border-linea/70 bg-fondo/45 p-2 text-center transition-colors hover:border-linea-fuerte"
              >
                <div className="w-full">
                  <h4 className="text-[12px] font-bold text-tinta leading-tight">
                    {integrante.nombre}
                  </h4>
                  <a
                    href={`mailto:${integrante.correo}`}
                    title={`Enviar correo a ${integrante.correo}`}
                    className="mt-0.5 block truncate font-mono text-[10.5px] text-tinta-tenue transition-colors hover:text-acento-vivo"
                  >
                    {integrante.correo}
                  </a>
                </div>

                {integrante.link ? (
                  <div className="mt-2 flex w-full justify-center">
                    <a
                      href={integrante.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={`Ver portafolio de ${integrante.nombre}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-acento/30 bg-acento/10 px-2 py-0.5 text-[10.5px] font-semibold text-acento-vivo transition-all hover:border-acento hover:bg-acento hover:text-white active:scale-95"
                    >
                      <svg viewBox="0 0 16 16" className="h-3 w-3 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="8" cy="8" r="6" />
                        <path d="M2 8h12M8 2a9.5 9.5 0 0 1 0 12M8 2a9.5 9.5 0 0 0 0 12" />
                      </svg>
                      <span>Portafolio</span>
                    </a>
                  </div>
                ) : (
                  <div className="mt-2 h-[21px]" aria-hidden="true" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Botón centrado Entrar al Geovisor sin flecha */}
        <div className="mt-5 flex shrink-0 justify-center pb-1">
          <button
            type="button"
            onClick={alCerrar}
            className="inline-flex min-h-[42px] cursor-pointer items-center justify-center rounded-xl border border-acento bg-acento px-8 py-2 font-display text-[14px] font-bold text-white shadow-md transition-all hover:bg-acento-vivo hover:shadow-lg active:scale-98"
          >
            Entrar al Geovisor
          </button>
        </div>
      </div>
    </div>
  );
}

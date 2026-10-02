export interface VerifiedLogo {
  name: string;
  imageUrl: string;
}
export interface VerifiedTestimonial {
  quote: string;
  name: string;
  company: string;
}
export interface VerifiedStat {
  value: string;
  label: string;
}

export function SocialProof({
  logos = [],
  testimonials = [],
  stats = [],
}: {
  logos?: VerifiedLogo[];
  testimonials?: VerifiedTestimonial[];
  stats?: VerifiedStat[];
}) {
  if (!logos.length && !testimonials.length && !stats.length) return null;
  return (
    <section aria-label="Customer proof" className="border-y bg-card py-12">
      <div className="mx-auto max-w-6xl px-5">
        {!!logos.length && (
          <div className="flex overflow-hidden">
            <div className="flex min-w-max gap-12">
              {logos.map((logo) => (
                <img
                  key={logo.name}
                  src={logo.imageUrl}
                  alt={logo.name}
                  className="h-10 w-auto"
                  loading="lazy"
                />
              ))}
            </div>
          </div>
        )}
        {!!testimonials.length && (
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {testimonials.map((item) => (
              <figure className="surface p-6" key={`${item.name}-${item.company}`}>
                <blockquote>“{item.quote}”</blockquote>
                <figcaption className="mt-4 font-semibold">
                  {item.name} · {item.company}
                </figcaption>
              </figure>
            ))}
          </div>
        )}
        {!!stats.length && (
          <dl className="mt-8 grid gap-6 sm:grid-cols-3">
            {stats.map((stat) => (
              <div key={stat.label}>
                <dt className="text-muted-foreground">{stat.label}</dt>
                <dd className="font-display text-3xl font-semibold">{stat.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </section>
  );
}

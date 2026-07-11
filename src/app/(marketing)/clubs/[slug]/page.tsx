import { notFound } from "next/navigation";
import { getTeamPublicBySlug } from "@modules/team";
import { ClubMiniMapWrapper } from "./_map-wrapper";

export const revalidate = 60;

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default async function ClubProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const team = await getTeamPublicBySlug(slug);
  if (!team) notFound();

  return (
    <div className="min-h-screen bg-background">
      {/* Back link */}
      <div className="border-b px-4 py-3">
        <a href="/clubs" className="text-sm text-muted-foreground hover:text-foreground">
          ← All clubs
        </a>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col md:flex-row gap-6">
        {/* Left sidebar */}
        <aside className="w-full md:w-72 flex-shrink-0 space-y-4">
          {/* Mini map */}
          {team.lat !== null && team.lng !== null ? (
            <div className="h-48 rounded border overflow-hidden">
              <ClubMiniMapWrapper lat={team.lat} lng={team.lng} name={team.name} />
            </div>
          ) : null}

          {/* Contact */}
          <div className="border rounded p-4 space-y-2 text-sm">
            {team.address && (
              <p className="text-muted-foreground">📍 {team.address}</p>
            )}
            {team.contactEmail && (
              <a
                href={`mailto:${team.contactEmail}`}
                className="block text-primary hover:underline"
              >
                ✉ {team.contactEmail}
              </a>
            )}
            {team.contactPhone && (
              <a
                href={`tel:${team.contactPhone}`}
                className="block text-primary hover:underline"
              >
                📱 {team.contactPhone}
              </a>
            )}
            {!team.address && !team.contactEmail && !team.contactPhone && (
              <p className="text-muted-foreground">No contact info listed.</p>
            )}
          </div>
        </aside>

        {/* Right content */}
        <main className="flex-1 space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            {team.logoUrl ? (
              <img
                src={team.logoUrl}
                alt={team.name}
                className="w-16 h-16 rounded object-contain"
              />
            ) : (
              <div className="w-16 h-16 rounded bg-primary flex items-center justify-center text-primary-foreground font-extrabold text-2xl">
                {team.name[0]}
              </div>
            )}
            <div>
              <h1 className="font-[family-name:var(--font-lexend)] font-extrabold tracking-tight text-2xl">
                {team.name}
              </h1>
              {team.origin && (
                <p className="text-muted-foreground text-sm">{team.origin}</p>
              )}
              <span className="inline-block mt-1 bg-green-100 text-green-800 text-xs font-bold px-2 py-0.5 rounded">
                OPEN TO PLAYERS
              </span>
            </div>
          </div>

          {/* Description */}
          {team.description && (
            <p className="text-muted-foreground">{team.description}</p>
          )}

          {/* Training schedule */}
          {team.trainingSlots.length > 0 && (
            <div>
              <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-2">
                Training Schedule
              </h2>
              <div className="border rounded overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left">Day</th>
                      <th className="px-3 py-2 text-left">Time</th>
                      <th className="px-3 py-2 text-left">Venue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {team.trainingSlots.map((slot) => (
                      <tr key={slot.id} className="border-t">
                        <td className="px-3 py-2 font-medium">
                          {DAY_NAMES[slot.dayOfWeek]}
                        </td>
                        <td className="px-3 py-2">
                          {slot.startTime} – {slot.endTime}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {slot.venue ?? team.trainingGround ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tournament history */}
          {team.tournamentEntries.length > 0 && (
            <div>
              <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-2">
                Tournament History
              </h2>
              <div className="flex flex-wrap gap-2">
                {team.tournamentEntries.map((entry) => (
                  <span
                    key={entry.id}
                    className="bg-muted text-muted-foreground text-xs px-2 py-1 rounded border"
                  >
                    {entry.tournament.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

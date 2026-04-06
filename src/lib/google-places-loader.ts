let googlePlacesPromise: Promise<void> | null = null;

export function loadGooglePlacesApi(apiKey?: string): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (!apiKey) return Promise.resolve();

  const hasPlacesLibrary = () => {
    const w = window as Window & {
      google?: {
        maps?: {
          importLibrary?: (libraryName: string) => Promise<unknown>;
          places?: {
            Autocomplete?: unknown;
            PlaceAutocompleteElement?: unknown;
          };
        };
      };
    };
    return Boolean(
      w.google?.maps?.places?.Autocomplete ||
        w.google?.maps?.places?.PlaceAutocompleteElement
    );
  };

  if (hasPlacesLibrary()) return Promise.resolve();
  if (googlePlacesPromise) return googlePlacesPromise;

  googlePlacesPromise = new Promise<void>((resolve, reject) => {
    const scriptId = "google-maps-places-api";
    const existing = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (existing) {
      const wNow = window as Window & {
        google?: { maps?: { importLibrary?: (libraryName: string) => Promise<unknown> } };
      };
      if (hasPlacesLibrary()) {
        resolve();
        return;
      }
      if (wNow.google?.maps?.importLibrary) {
        wNow.google.maps
          .importLibrary("places")
          .then(() => resolve())
          .catch((error) =>
            reject(
              error instanceof Error
                ? error
                : new Error("Failed to load Places library.")
            )
          );
        return;
      }

      existing.addEventListener("load", async () => {
        try {
          const w = window as Window & {
            google?: { maps?: { importLibrary?: (libraryName: string) => Promise<unknown> } };
          };
          if (w.google?.maps?.importLibrary) {
            await w.google.maps.importLibrary("places");
          }
          resolve();
        } catch (error) {
          reject(error instanceof Error ? error : new Error("Failed to load Places library."));
        }
      });
      existing.addEventListener("error", () => reject(new Error("Failed to load Google Maps script.")));
      return;
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      apiKey
    )}&libraries=places&v=weekly&loading=async`;
    script.onload = async () => {
      try {
        const w = window as Window & {
          google?: { maps?: { importLibrary?: (libraryName: string) => Promise<unknown> } };
        };
        if (w.google?.maps?.importLibrary) {
          await w.google.maps.importLibrary("places");
        }
        resolve();
      } catch (error) {
        reject(error instanceof Error ? error : new Error("Failed to load Places library."));
      }
    };
    script.onerror = () => reject(new Error("Failed to load Google Maps Places API."));
    document.head.appendChild(script);
  });

  return googlePlacesPromise;
}


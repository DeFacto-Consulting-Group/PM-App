"use client";

import { useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { loadGooglePlacesApi } from "@/lib/google-places-loader";

type Props = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
};

type PlaceLike = {
  formatted_address?: string;
};

type AutocompleteLike = {
  addListener: (eventName: "place_changed", handler: () => void) => void;
  getPlace?: () => PlaceLike;
};

type GoogleLike = {
  maps?: {
    places?: {
      Autocomplete?: new (
        input: HTMLInputElement,
        opts?: { types?: string[]; fields?: string[] }
      ) => AutocompleteLike;
    };
    event?: {
      clearInstanceListeners: (instance: unknown) => void;
    };
  };
};

export function AddressAutocompleteInput({
  id,
  value,
  onChange,
  placeholder,
  autoComplete = "street-address",
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const onChangeRef = useRef(onChange);
  const initStartedRef = useRef(false);
  const autocompleteRef = useRef<AutocompleteLike | null>(null);
  const retryTimerRef = useRef<number | null>(null);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const initializeAutocomplete = () => {
    if (initStartedRef.current || autocompleteRef.current) return;
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) return;
    initStartedRef.current = true;

    const tryInit = () => {
      const googleObj = (window as Window & { google?: GoogleLike }).google;
      if (!googleObj?.maps?.places?.Autocomplete) {
        retryTimerRef.current = window.setTimeout(tryInit, 200);
        return;
      }

      const inputEl =
        inputRef.current ??
        (document.getElementById(id) as HTMLInputElement | null);

      if (!inputEl) {
        retryTimerRef.current = window.setTimeout(tryInit, 200);
        return;
      }

      const autocomplete = new googleObj.maps.places.Autocomplete(inputEl, {
        types: ["address"],
        fields: ["formatted_address", "address_components"],
      });
      autocompleteRef.current = autocomplete;

      autocomplete.addListener("place_changed", () => {
        const place = autocompleteRef.current?.getPlace?.();
        const formatted = place?.formatted_address || inputEl.value || "";
        onChangeRef.current(formatted);
      });
    };

    void loadGooglePlacesApi(apiKey)
      .then(() => {
        tryInit();
      })
      .catch((error) => {
        console.warn("Google Places autocomplete unavailable:", error);
      });
  };

  useEffect(() => {
    return () => {
      if (retryTimerRef.current) {
        window.clearTimeout(retryTimerRef.current);
      }
      const googleObj = (
        window as Window & { google?: GoogleLike }
      ).google;
      if (autocompleteRef.current && googleObj?.maps?.event?.clearInstanceListeners) {
        googleObj.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, []);

  return (
    <Input
      ref={inputRef}
      id={id}
      value={value}
      autoComplete={autoComplete}
      placeholder={placeholder}
      onFocus={initializeAutocomplete}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}


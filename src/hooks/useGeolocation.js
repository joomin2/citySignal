"use client";
import { useCallback, useEffect, useRef, useState } from "react";

// Lightweight reusable geolocation hook.
// Returns { status, error, coords, getLocation }.
// status: idle | locating | ready | error
export function useGeolocation(options = { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }) {
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [coords, setCoords] = useState(null);
  const alive = useRef(true);

  useEffect(() => () => { alive.current = false; }, []);

  const getLocation = useCallback(() => {
    setError("");
    setStatus("locating");
    if (!("geolocation" in navigator)) {
      setError("브라우저가 위치를 지원하지 않습니다.");
      setStatus("error");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!alive.current) return;
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setStatus("ready");
      },
      (err) => {
        if (!alive.current) return;
        setError(err.message || "위치 권한 거부됨");
        setStatus("error");
      },
      options
    );
  }, [options]);

  return { status, error, coords, getLocation };
}

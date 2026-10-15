import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

export const useListParams = (filterKeys = []) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const keysSignature = filterKeys.join(",");

  const get = useCallback((key) => searchParams.get(key) ?? "", [searchParams]);

  const setFilter = useCallback(
    (key, value) =>
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (value === "" || value === null || value === undefined) next.delete(key);
        else next.set(key, String(value));
        next.set("page", "1");
        return next;
      }),
    [setSearchParams]
  );

  const clearFilters = useCallback(
    () =>
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        keysSignature.split(",").forEach((key) => key && next.delete(key));
        next.set("page", "1");
        return next;
      }),
    [setSearchParams, keysSignature]
  );

  const hasFilters = filterKeys.some((key) => searchParams.get(key));

  return { searchParams, get, setFilter, clearFilters, hasFilters };
};

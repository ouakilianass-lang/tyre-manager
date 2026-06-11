"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";

export default function VehiculeSearch({ defaultValue }: { defaultValue: string }) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (value.trim()) {
      router.push(`/vehicules?q=${encodeURIComponent(value.trim())}`);
    } else {
      router.push("/vehicules");
    }
  }

  function handleClear() {
    setValue("");
    router.push("/vehicules");
  }

  return (
    <form onSubmit={handleSearch} className="flex gap-2 max-w-md">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          className="pl-9 pr-8"
          placeholder="Rechercher une immatriculation..."
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      <Button type="submit">Rechercher</Button>
    </form>
  );
}

"use client";

import { useState, useRef, useEffect } from "react";
import { X, Plus, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface TagOption {
  value: string;
  label: string;
  color?: string;
}

interface MultiSelectTagsProps {
  options: TagOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  maxHeight?: string;
  allowCustom?: boolean;
  className?: string;
}

export function MultiSelectTags({
  options,
  selected,
  onChange,
  placeholder = "Select tags...",
  maxHeight = "max-h-48",
  allowCustom = false,
  className,
}: MultiSelectTagsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(search.toLowerCase())
  );

  const handleToggleTag = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const handleRemoveTag = (value: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selected.filter((v) => v !== value));
  };

  const handleAddCustom = () => {
    if (search && allowCustom && !selected.includes(search)) {
      onChange([...selected, search]);
      setSearch("");
    }
  };

  const getTagColor = (value: string) => {
    return options.find((opt) => opt.value === value)?.color || "bg-slate-100 text-slate-700 border-slate-200";
  };

  const getTagLabel = (value: string) => {
    return options.find((opt) => opt.value === value)?.label || value;
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Selected tags display */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "min-h-[40px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background cursor-pointer",
          "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
          "hover:border-slate-400 transition-colors"
        )}
      >
        {selected.length === 0 ? (
          <span className="text-muted-foreground">{placeholder}</span>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {selected.map((value) => (
              <Badge
                key={value}
                variant="outline"
                className={cn("pl-2 pr-1.5 py-0.5", getTagColor(value))}
              >
                <span className="text-xs">{getTagLabel(value)}</span>
                <button
                  type="button"
                  onClick={(e) => handleRemoveTag(value, e)}
                  className="ml-1 hover:bg-black/10 rounded-sm p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg">
          {/* Search input */}
          <div className="p-2 border-b">
            <Input
              type="text"
              placeholder="Search or type..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && allowCustom && search) {
                  e.preventDefault();
                  handleAddCustom();
                }
              }}
              className="h-8 text-sm"
              autoFocus
            />
          </div>

          {/* Options list */}
          <div className={cn("overflow-y-auto p-1", maxHeight)}>
            {filteredOptions.length === 0 ? (
              <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                {allowCustom ? (
                  <div>
                    <p className="mb-2">No matches found</p>
                    {search && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleAddCustom}
                        className="gap-1"
                      >
                        <Plus className="h-3 w-3" />
                        Add "{search}"
                      </Button>
                    )}
                  </div>
                ) : (
                  "No options found"
                )}
              </div>
            ) : (
              <div className="space-y-0.5">
                {filteredOptions.map((option) => {
                  const isSelected = selected.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleToggleTag(option.value)}
                      className={cn(
                        "w-full flex items-center justify-between px-2 py-1.5 text-sm rounded-sm",
                        "hover:bg-accent hover:text-accent-foreground",
                        "transition-colors"
                      )}
                    >
                      <span>{option.label}</span>
                      {isSelected && <Check className="h-4 w-4 text-primary" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

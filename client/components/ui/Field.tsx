"use client";

import {
  useState,
  useRef,
  useEffect,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import React from "react";
import { cn } from "@/lib/utils";
import { EyeIcon, EyeOffIcon } from "@/components/icons";

function extractOptions(node: React.ReactNode, list: { value: string; label: string }[]): void {
  React.Children.forEach(node, (child) => {
    if (React.isValidElement(child)) {
      const element = child as React.ReactElement<any>;
      if (element.type === "option") {
        const props = element.props;
        const val = props.value !== undefined ? props.value : props.children;
        const lbl = typeof props.children === "string" || typeof props.children === "number"
          ? String(props.children)
          : String(val);
        list.push({ value: String(val), label: lbl });
      } else if (element.type === React.Fragment) {
        extractOptions(element.props.children, list);
      } else if (element.props && element.props.children) {
        extractOptions(element.props.children, list);
      }
    }
  });
}

const control =
  "w-full rounded-2xl border bg-white px-4 text-[15px] text-brand-dark outline-none transition-colors placeholder:text-muted/60 focus:border-brand disabled:bg-black/[0.03]";

export function Label({
  children,
  htmlFor,
  hint,
}: {
  children: ReactNode;
  htmlFor?: string;
  hint?: string;
}) {
  return (
    <div className="mb-1.5 flex items-center justify-between">
      <label htmlFor={htmlFor} className="text-sm font-medium text-brand-dark">
        {children}
      </label>
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </div>
  );
}

export function Input({
  label,
  id,
  className,
  type,
  error,
  ...props
}: { label?: string; error?: string } & InputHTMLAttributes<HTMLInputElement>) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword ? (showPassword ? "text" : "password") : type;

  return (
    <div>
      {label && <Label htmlFor={id}>{label}</Label>}
      <div className="relative">
        <input
          id={id}
          type={inputType}
          className={cn(
            control,
            "h-12",
            isPassword && "pr-12",
            error ? "border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500" : "border-black/[0.12]",
            className
          )}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-brand-dark transition-colors focus:outline-none"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <EyeOffIcon className="h-5 w-5" />
            ) : (
              <EyeIcon className="h-5 w-5" />
            )}
          </button>
        )}
      </div>
      {error && (
        <p className="mt-1.5 text-xs text-red-600 font-medium leading-relaxed">{error}</p>
      )}
    </div>
  );
}

export function Textarea({
  label,
  id,
  className,
  error,
  ...props
}: { label?: string; error?: string } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div>
      {label && <Label htmlFor={id}>{label}</Label>}
      <textarea
        id={id}
        className={cn(
          control,
          "resize-none py-3",
          error ? "border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500" : "border-black/[0.12]",
          className
        )}
        {...props}
      />
      {error && (
        <p className="mt-1.5 text-xs text-red-600 font-medium leading-relaxed">{error}</p>
      )}
    </div>
  );
}

export function Select({
  label,
  id,
  className,
  children,
  value: controlledValue,
  defaultValue,
  onChange,
  disabled,
  placeholder = "Select an option...",
  required,
  name,
  error,
}: {
  label?: string;
  placeholder?: string;
  error?: string;
} & SelectHTMLAttributes<HTMLSelectElement>) {
  // Extract options from children
  const optionsList: { value: string; label: string }[] = [];
  extractOptions(children, optionsList);

  // Identify whether it is controlled
  const isControlled = controlledValue !== undefined;
  
  // Local state for value (if uncontrolled or fallback)
  const [localValue, setLocalValue] = useState(defaultValue || "");

  // Active value
  const activeValue = isControlled ? String(controlledValue) : String(localValue);

  // State for search query and dropdown open
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  // References
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Filter options based on search query
  const filteredOptions = optionsList.filter((opt) =>
    opt.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Reset search query when dropdown opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
    }
  }, [isOpen]);

  const handleSelectOption = (optValue: string) => {
    if (!isControlled) {
      setLocalValue(optValue);
    }
    setIsOpen(false);

    if (onChange) {
      onChange({
        target: {
          id,
          name: name || id,
          value: optValue,
        },
      } as React.ChangeEvent<HTMLSelectElement>);
    }
  };

  // Find label of active value
  const activeOption = optionsList.find((opt) => opt.value === activeValue);
  const displayLabel = activeOption ? activeOption.label : activeValue || placeholder;

  return (
    <div ref={containerRef} className="relative w-full">
      {label && <Label htmlFor={id}>{label}</Label>}
      <div className="relative">
        <button
          id={id}
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            control,
            "h-12 flex items-center justify-between text-left w-full",
            isOpen && "border-brand ring-1 ring-brand/20",
            error ? "border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500" : "border-black/[0.12]",
            disabled && "bg-black/[0.03] cursor-not-allowed text-muted/60",
            className
          )}
        >
          <span className={cn(!activeOption && "text-muted/60")}>
            {displayLabel}
          </span>
          <svg
            className={cn(
              "h-4 w-4 text-muted transition-transform duration-200 shrink-0 ml-2",
              isOpen && "rotate-180"
            )}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>

        {/* Hidden inputs to make HTML Forms and refs work with FormData */}
        <input
          type="hidden"
          name={name || id}
          value={activeValue}
          required={required}
        />

        {isOpen && (
          <div className="absolute z-50 mt-1 w-full rounded-2xl border border-black/[0.12] bg-white shadow-lg overflow-hidden py-1">
            {/* Search Input */}
            <div className="relative border-b border-black/[0.06] p-2">
              <svg
                className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="h-9 w-full rounded-lg border border-black/[0.08] bg-black/[0.01] pl-9 pr-3 text-sm text-brand-dark outline-none focus:border-brand"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            {/* Options List */}
            <div className="max-h-60 overflow-y-auto">
              {filteredOptions.length === 0 ? (
                <div className="px-4 py-3 text-sm text-muted">
                  {searchQuery ? "No matching results found" : "No options available"}
                </div>
              ) : (
                filteredOptions.map((opt) => {
                  const isMsgOption = opt.value === "" && (opt.label.includes("Loading") || opt.label.includes("No "));
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      disabled={isMsgOption}
                      onClick={() => handleSelectOption(opt.value)}
                      className={cn(
                        "w-full text-left px-4 py-2.5 text-[15px] transition-colors",
                        isMsgOption
                          ? "text-muted/60 bg-transparent cursor-not-allowed"
                          : opt.value === activeValue
                          ? "bg-mint text-brand-dark font-medium"
                          : "text-brand-dark hover:bg-black/[0.04]"
                      )}
                    >
                      {opt.label}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
      {error && (
        <p className="mt-1.5 text-xs text-red-600 font-medium leading-relaxed">{error}</p>
      )}
    </div>
  );
}

import { CalendarIcon } from "lucide-react"
import * as React from "react"

import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

function parseDateValue(value: string): Date | undefined {
  if (!value) {
    return undefined
  }

  const [year, month, day] = value.split("-").map(Number)

  if (!year || !month || !day) {
    return undefined
  }

  return new Date(year, month - 1, day)
}

function formatDateValue(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

export interface DatePickerProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  /** Blocks every date before today. Defaults to true. */
  disablePast?: boolean
  className?: string
}

/**
 * A calendar-dropdown date picker. Stores and emits dates as plain
 * "YYYY-MM-DD" strings, matching the format a native `<input type="date">`
 * would submit, so it's a drop-in replacement for one.
 */
function DatePicker({
  value,
  onChange,
  placeholder = "Select a date",
  disablePast = true,
  className,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)

  const selectedDate = parseDateValue(value)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "group flex w-full items-center justify-between rounded-xl border border-slate-300 bg-white py-2 pr-2 pl-4 text-left text-sm font-medium text-slate-800 transition outline-none hover:border-blue-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100",
            !selectedDate && "text-slate-400",
            className
          )}
        >
          <span>
            {selectedDate
              ? selectedDate.toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })
              : placeholder}
          </span>

          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 transition group-hover:bg-blue-100 group-focus:bg-blue-100">
            <CalendarIcon className="size-4" />
          </span>
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          defaultMonth={selectedDate ?? today}
          disabled={disablePast ? { before: today } : undefined}
          onSelect={(date) => {
            onChange(date ? formatDateValue(date) : "")
            setOpen(false)
          }}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  )
}

export { DatePicker }

import { CalendarClock } from "lucide-react"
import * as React from "react"

import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

function parseDateTimeValue(value: string): { date: Date | undefined; time: string } {
  if (!value) {
    return { date: undefined, time: "" }
  }

  const [datePart, timePart] = value.split("T")
  const [year, month, day] = (datePart ?? "").split("-").map(Number)

  if (!year || !month || !day) {
    return { date: undefined, time: "" }
  }

  return { date: new Date(year, month - 1, day), time: timePart ?? "" }
}

function formatDateTimeValue(date: Date, time: string): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}T${time || "00:00"}`
}

function parseDateOnly(value: string): Date | undefined {
  const [year, month, day] = value.split("-").map(Number)

  if (!year || !month || !day) {
    return undefined
  }

  return new Date(year, month - 1, day)
}

export interface DateTimePickerProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  /**
   * The earliest allowed "YYYY-MM-DDTHH:mm" — days before it are
   * disabled on the calendar, and any resulting value earlier than it
   * (picking today with an earlier time, for example) is clamped up
   * to it rather than accepted.
   */
  min?: string
  className?: string
}

/**
 * A calendar-dropdown date *and* time picker, matching DatePicker's look.
 * Stores and emits values as "YYYY-MM-DDTHH:mm", the same format a native
 * `<input type="datetime-local">` would submit, so it's a drop-in
 * replacement for one.
 */
function DateTimePicker({
  value,
  onChange,
  placeholder = "Select date & time",
  min,
  className,
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false)

  const { date: selectedDate, time: selectedTime } = parseDateTimeValue(value)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const minDate = min ? parseDateOnly(min.slice(0, 10)) : undefined
  const defaultTime = min ? min.slice(11, 16) : "09:00"

  const commit = (date: Date | undefined, time: string): void => {
    if (!date) {
      onChange("")

      return
    }

    const next = formatDateTimeValue(date, time || defaultTime)

    onChange(min && next < min ? min : next)
  }

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
                }) +
                (selectedTime
                  ? ", " +
                    new Date(`2000-01-01T${selectedTime}`).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    })
                  : "")
              : placeholder}
          </span>

          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 transition group-hover:bg-blue-100 group-focus:bg-blue-100">
            <CalendarClock className="size-4" />
          </span>
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          defaultMonth={selectedDate ?? minDate ?? today}
          disabled={minDate ? { before: minDate } : undefined}
          onSelect={(date) => commit(date, selectedTime)}
          autoFocus
        />

        <div className="border-t border-slate-200 p-3">
          <label className="mb-1.5 block text-xs font-bold text-slate-500">
            Time
          </label>

          <input
            type="time"
            value={selectedTime}
            disabled={!selectedDate}
            onChange={(event) => commit(selectedDate, event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
          />
        </div>

        <div className="border-t border-slate-200 p-2">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="w-full rounded-lg py-2 text-center text-sm font-bold text-blue-600 transition hover:bg-blue-50"
          >
            Done
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export { DateTimePicker }

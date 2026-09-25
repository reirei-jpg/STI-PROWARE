import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import * as React from "react"
import { DayPicker, type DayButton } from "react-day-picker"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        // Every color below is an explicit slate/blue value, not the
        // semantic bg-popover/bg-primary/bg-accent/text-muted-foreground
        // tokens the shadcn default uses — those flip to a near-black
        // palette under the app's OS-driven dark-mode detection, even
        // though every other page in this app is unconditionally
        // light-themed, so this calendar looked like a broken black box
        // whenever the browser/OS was set to dark mode.
        months: "flex flex-col sm:flex-row gap-2",
        month: "flex flex-col gap-4",
        month_caption: "flex justify-center pt-1 relative items-center w-full",
        caption_label: "text-sm font-bold text-slate-900",
        nav: "flex items-center justify-between absolute inset-x-0 top-0",
        button_previous: cn(
          buttonVariants({ variant: "outline" }),
          "size-7 border-slate-300 bg-white p-0 text-slate-800 opacity-80 hover:bg-slate-100 hover:text-slate-900 hover:opacity-100"
        ),
        button_next: cn(
          buttonVariants({ variant: "outline" }),
          "size-7 border-slate-300 bg-white p-0 text-slate-800 opacity-80 hover:bg-slate-100 hover:text-slate-900 hover:opacity-100"
        ),
        month_grid: "w-full border-collapse space-x-1",
        weekdays: "flex",
        weekday: "text-slate-600 rounded-md w-8 font-bold text-[0.8rem]",
        week: "flex w-full mt-2",
        day: "size-8 text-center text-sm p-0 relative [&:has([aria-selected])]:bg-blue-50 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "size-8 p-0 font-bold text-slate-900 hover:bg-slate-100 hover:text-slate-900 aria-selected:opacity-100"
        ),
        range_end: "day-range-end",
        selected:
          "bg-blue-600 text-white hover:bg-blue-600 hover:text-white focus:bg-blue-600 focus:text-white rounded-md",
        today: "bg-slate-100 text-slate-900 rounded-md",
        outside:
          "day-outside text-slate-400 opacity-50 aria-selected:bg-blue-50 aria-selected:text-slate-400 aria-selected:opacity-30",
        disabled: "text-slate-300 opacity-50",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, ...chevronProps }) =>
          orientation === "left" ? (
            <ChevronLeftIcon className="size-4" {...chevronProps} />
          ) : (
            <ChevronRightIcon className="size-4" {...chevronProps} />
          ),
        DayButton: ({
          className: dayButtonClassName,
          day: _day,
          modifiers: _modifiers,
          ...dayButtonProps
        }: React.ComponentProps<typeof DayButton>) => (
          <button
            type="button"
            className={dayButtonClassName}
            {...dayButtonProps}
          />
        ),
      }}
      {...props}
    />
  )
}

export { Calendar }

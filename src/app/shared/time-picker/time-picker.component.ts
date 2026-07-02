import { Component, forwardRef, HostListener, Input, OnInit, ElementRef, AfterViewInit, ViewChild, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

@Component({
    selector: 'app-time-picker',
    templateUrl: './time-picker.component.html',
    styleUrls: ['./time-picker.component.scss'],
    standalone: true,
    imports: [CommonModule, FormsModule, MatIconModule],
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => TimePickerComponent),
            multi: true
        }
    ]
})
export class TimePickerComponent implements ControlValueAccessor, OnInit, AfterViewInit {
    @Input() label: string = 'Hora';
    @ViewChild('hoursList') hoursList: ElementRef;
    @ViewChild('minutesList') minutesList: ElementRef;

    isOpen: boolean = false;
    displayValue: string = '--:--';

    selectedHour: number = 9;
    selectedMinute: number = 0;

    hours: number[] = Array.from({ length: 24 }, (_, i) => i);
    minutes: number[] = Array.from({ length: 60 }, (_, i) => i);

    // Padding items for centering effect (show 2 items above/below center)
    paddingItems: number[] = [0, 1]; 

    private onChange: (value: string) => void = () => {};
    private onTouched: () => void = () => {};
    private itemHeight = 44;

    constructor(private _cdRef: ChangeDetectorRef) {}

    ngOnInit(): void {}

    ngAfterViewInit(): void {}

    /** Called by ControlValueAccessor when parent form sets a value */
    writeValue(value: string): void {
        if (value && value.includes(':')) {
            const [h, m] = value.split(':').map(Number);
            this.selectedHour = isNaN(h) ? 9 : h;
            this.selectedMinute = isNaN(m) ? 0 : m;
            this.updateDisplay();
        }
    }

    registerOnChange(fn: any): void { this.onChange = fn; }
    registerOnTouched(fn: any): void { this.onTouched = fn; }

    openPicker(): void {
        this.isOpen = true;
        this.onTouched();
        setTimeout(() => {
            this.scrollToSelected();
        }, 50);
    }

    closePicker(): void {
        this.isOpen = false;
    }

    confirmSelection(): void {
        this.updateDisplay();
        const timeStr = `${String(this.selectedHour).padStart(2, '0')}:${String(this.selectedMinute).padStart(2, '0')}`;
        this.onChange(timeStr);
        this.closePicker();
    }

    updateDisplay(): void {
        this.displayValue = `${String(this.selectedHour).padStart(2, '0')}:${String(this.selectedMinute).padStart(2, '0')}`;
    }

    selectHour(h: number): void {
        this.selectedHour = h;
        this.scrollColumn(this.hoursList, h);
    }

    selectMinute(m: number): void {
        this.selectedMinute = m;
        this.scrollColumn(this.minutesList, m);
    }

    onHourScroll(event: Event): void {
        const el = (event.target as HTMLElement);
        const index = Math.round(el.scrollTop / this.itemHeight);
        if (index >= 0 && index < this.hours.length) {
            this.selectedHour = this.hours[index];
            this._cdRef.markForCheck();
        }
    }

    onMinuteScroll(event: Event): void {
        const el = (event.target as HTMLElement);
        const index = Math.round(el.scrollTop / this.itemHeight);
        if (index >= 0 && index < this.minutes.length) {
            this.selectedMinute = this.minutes[index];
            this._cdRef.markForCheck();
        }
    }

    scrollColumn(elRef: ElementRef, index: number): void {
        if (!elRef?.nativeElement) return;
        elRef.nativeElement.scrollTo({
            top: index * this.itemHeight,
            behavior: 'smooth'
        });
    }

    scrollToSelected(): void {
        this.scrollColumn(this.hoursList, this.selectedHour);
        this.scrollColumn(this.minutesList, this.selectedMinute);
    }

    pad(n: number): string {
        return String(n).padStart(2, '0');
    }

    @HostListener('document:click', ['$event'])
    onDocClick(event: MouseEvent): void {
        // Close is handled manually via backdrop click
    }

    onBackdropClick(): void {
        this.closePicker();
    }
}

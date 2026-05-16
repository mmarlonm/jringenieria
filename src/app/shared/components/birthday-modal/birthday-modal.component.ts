import { Component, OnInit, inject, ViewChild, ElementRef, AfterViewInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { confetti } from 'app/shared/utils/confetti.utils';

@Component({
    selector: 'app-birthday-modal',
    standalone: true,
    imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
    templateUrl: './birthday-modal.component.html',
    styleUrls: ['./birthday-modal.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class BirthdayModalComponent implements OnInit, OnDestroy {
    private _dialogRef = inject(MatDialogRef<BirthdayModalComponent>);

    phrases: string[] = [
        "Que este nuevo año de vida te traiga tanta alegría y luz como la que aportas a nuestro equipo todos los días.",
        "Hoy celebramos no solo tu cumpleaños, sino la increíble persona que eres. ¡Gracias por inspirarnos siempre!",
        "Tu energía y dedicación hacen de este lugar algo especial. Que hoy recibas todo el cariño que mereces.",
        "Un año más de vida es un regalo hermoso. Deseamos que este nuevo ciclo esté lleno de paz, salud y momentos inolvidables.",
        "Detrás de cada gran logro hay personas excepcionales como tú. ¡Que tengas un cumpleaños tan extraordinario como tú lo eres!"
    ];

    randomPhrase: string = '';

    ngOnInit(): void {
        this.randomPhrase = this.phrases[Math.floor(Math.random() * this.phrases.length)];

        // Initial celebration sequence
        setTimeout(() => {
            this.celebrate();
        }, 500);
    }

    ngOnDestroy(): void {
        // Cleanup if needed
    }

    celebrate(): void {
        // Left cannon
        confetti({
            particleCount: 80,
            angle: 60,
            spread: 55,
            origin: { x: 0, y: 0.8 },
            colors: ['#6366f1', '#a855f7', '#ec4899']
        });

        // Right cannon
        confetti({
            particleCount: 80,
            angle: 120,
            spread: 55,
            origin: { x: 1, y: 0.8 },
            colors: ['#f59e0b', '#10b981', '#6366f1']
        });

        // Center burst after a slight delay
        setTimeout(() => {
            confetti({
                particleCount: 100,
                spread: 100,
                origin: { x: 0.5, y: 0.6 },
                scalar: 1.2
            });
        }, 300);
    }

    close(): void {
        this._dialogRef.close();
    }
}

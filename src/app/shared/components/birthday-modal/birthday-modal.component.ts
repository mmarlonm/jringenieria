import { Component, OnInit, inject } from '@angular/core';
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
    styleUrls: ['./birthday-modal.component.scss']
})
export class BirthdayModalComponent implements OnInit {
    private _dialogRef = inject(MatDialogRef<BirthdayModalComponent>);

    phrases: string[] = [
        "El éxito no es el final, el fracaso no es fatal: es el coraje para continuar lo que cuenta.",
        "Tu única competencia eres tú mismo de ayer. ¡Sigue superándote!",
        "No cuentes los días, haz que los días cuenten. ¡Felicidades por un año más de impacto!",
        "Cree en tu potencial infinito. Tus únicas limitaciones son las que tú mismo te impones.",
        "Un año más para ser la mejor versión de ti mismo. El mundo espera tu genialidad."
    ];

    randomPhrase: string = '';

    ngOnInit(): void {
        this.randomPhrase = this.phrases[Math.floor(Math.random() * this.phrases.length)];

        // Initial celebration sequence
        setTimeout(() => {
            this.celebrate();
        }, 500);
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

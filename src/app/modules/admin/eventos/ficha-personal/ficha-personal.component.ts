import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PersonalStaff, PersonalStaffService } from '../personal-staff/personal-staff.service';

@Component({
    selector: 'app-ficha-personal',
    templateUrl: './ficha-personal.component.html',
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,
        MatButtonModule,
        MatIconModule,
        MatTooltipModule
    ]
})
export class FichaPersonalComponent implements OnInit {
    token: string = '';
    personal: PersonalStaff | null = null;
    isLoading: boolean = true;
    hasError: boolean = false;
    copied: boolean = false;

    constructor(
        private _route: ActivatedRoute,
        private _personalStaffService: PersonalStaffService
    ) { }

    ngOnInit(): void {
        this.token = this._route.snapshot.paramMap.get('token') || '';
        if (this.token) {
            this.loadFicha();
        } else {
            this.isLoading = false;
            this.hasError = true;
        }
    }

    loadFicha(): void {
        this.isLoading = true;
        this._personalStaffService.getByTokenQr(this.token).subscribe({
            next: (data) => {
                this.personal = data;
                this.isLoading = false;
                this.hasError = false;
            },
            error: (err) => {
                console.error(err);
                this.isLoading = false;
                this.hasError = true;
            }
        });
    }

    getPhotoUrl(): string {
        if (!this.personal || !this.personal.fotoPath) {
            return 'assets/images/avatars/profile.jpg';
        }
        return this._personalStaffService.getPhotoUrl(this.personal.id);
    }

    openWeb(): void {
        if (this.personal && this.personal.linkWeb) {
            let url = this.personal.linkWeb.trim();
            if (!/^https?:\/\//i.test(url)) {
                url = 'https://' + url;
            }
            window.open(url, '_blank');
        }
    }

    openWhatsapp(): void {
        if (this.personal && this.personal.telefonoWhatsapp) {
            const cleanPhone = this.personal.telefonoWhatsapp.replace(/[^\d]/g, '');
            const url = `https://wa.me/${cleanPhone}`;
            window.open(url, '_blank');
        }
    }

    shareProfile(): void {
        const shareData = {
            title: `Ficha de Contacto - ${this.personal?.nombreCompleto}`,
            text: `${this.personal?.cargo} en ${this.personal?.empresa}`,
            url: window.location.href
        };

        if (navigator.share) {
            navigator.share(shareData).catch(err => console.log('Error sharing:', err));
        } else {
            navigator.clipboard.writeText(window.location.href).then(() => {
                this.copied = true;
                setTimeout(() => {
                    this.copied = false;
                }, 2500);
            }).catch(err => console.error('Could not copy link:', err));
        }
    }
}

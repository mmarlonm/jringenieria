import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'currencyMask',
  standalone: true // Hacer el Pipe standalone
})
export class CurrencyMaskPipe implements PipeTransform {
  transform(value: any): string {
    if (value === null || value === undefined || value === '') return '';

    let numericValue = parseFloat(value.toString().replace(/,/g, ''));
    
    if (isNaN(numericValue)) return '';

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(numericValue);
  }
}
import { Pipe, PipeTransform } from '@angular/core';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

@Pipe({
  name: 'timeAgo',
  standalone: true
})
export class TimeAgoPipe implements PipeTransform {

  transform(value: string | number | Date): string {
    if (!value) return '';
    
    // date-fns formatDistanceToNow returns strings like "hace 5 minutos" with the locale
    return formatDistanceToNow(new Date(value), { addSuffix: true, locale: es });
  }

}

import { TestBed } from '@angular/core/testing';
import { LimitControl } from './limit-control';

function setup(value = 10) {
  const fixture = TestBed.createComponent(LimitControl);
  fixture.componentRef.setInput('value', value);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const radios = () => Array.from(el.querySelectorAll<HTMLInputElement>('input[type="radio"]'));
  return { fixture, el, radios };
}

describe('LimitControl', () => {
  it('offers 10, 25, 50 and 100 with the current value selected', () => {
    const { radios } = setup(25);
    expect(radios().map((r) => r.value)).toEqual(['10', '25', '50', '100']);
    expect(radios().find((r) => r.checked)?.value).toBe('25');
  });

  it('moves the thumb to the selected option', () => {
    const { fixture, el } = setup(50);
    const track = el.querySelector<HTMLElement>('.track')!;
    expect(track.style.getPropertyValue('--i')).toBe('2');
    fixture.componentRef.setInput('value', 100);
    fixture.detectChanges();
    expect(track.style.getPropertyValue('--i')).toBe('3');
  });

  it('updates its value when an option is picked', () => {
    const { fixture, radios } = setup(10);
    const fifty = radios().find((r) => r.value === '50')!;
    fifty.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.value()).toBe(50);
  });
});

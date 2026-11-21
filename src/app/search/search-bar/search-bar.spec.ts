import { TestBed } from '@angular/core/testing';
import { SearchBar } from './search-bar';

function setup(query = '') {
  const fixture = TestBed.createComponent(SearchBar);
  fixture.componentRef.setInput('query', query);
  const emitted: string[] = [];
  fixture.componentInstance.search.subscribe((q) => emitted.push(q));
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;

  const input = () => el.querySelector<HTMLInputElement>('input')!;
  const note = () => el.querySelector('.note')!.textContent!.replace(/\s+/g, ' ').trim();
  const type = (text: string) => {
    input().value = text;
    input().dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };
  const submit = () => {
    el.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    fixture.detectChanges();
  };
  return { fixture, el, input, note, type, submit, emitted };
}

describe('SearchBar', () => {
  it('emits the trimmed query on submit', () => {
    const { type, submit, emitted } = setup();
    type('  drone AND (package OR delivery)  ');
    submit();
    expect(emitted).toEqual(['drone AND (package OR delivery)']);
  });

  it('refuses an invalid query and explains why, without emitting', () => {
    const { type, submit, note, input, emitted } = setup();
    type('drone AND (package');
    submit();
    expect(emitted).toEqual([]);
    expect(note()).toBe('Missing a closing ")".');
    expect(input().getAttribute('aria-invalid')).toBe('true');
  });

  it('keeps quiet about a half-typed query until the field is left', () => {
    const { type, note, input, fixture } = setup();
    type('(drone AND');
    expect(note()).toContain('Boolean search');
    input().dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    expect(note()).toBe("A search can't end with AND.");
    type('(drone AND package)');
    expect(note()).toContain('Boolean search');
  });

  it('emits an empty query when the search is cleared', () => {
    const { el, fixture, input, emitted } = setup('drone');
    el.querySelector<HTMLButtonElement>('.clear')!.click();
    fixture.detectChanges();
    expect(input().value).toBe('');
    expect(emitted).toEqual(['']);
  });

  it('shows the query it is given, and a hint for lowercase operators', () => {
    const { input, note } = setup('drone and package');
    expect(input().value).toBe('drone and package');
    expect(note()).toContain('capitals');
  });
});

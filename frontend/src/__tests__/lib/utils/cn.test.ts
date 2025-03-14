import { cn } from '@/lib/utils/cn';

describe('cn utility function', () => {
  it('should merge class names correctly', () => {
    expect(cn('class1', 'class2')).toBe('class1 class2');
  });

  it('should handle conditional classes', () => {
    const condition = true;
    expect(cn('class1', condition && 'class2')).toBe('class1 class2');
    expect(cn('class1', !condition && 'class2')).toBe('class1');
  });

  it('should handle array of classes', () => {
    expect(cn(['class1', 'class2'])).toBe('class1 class2');
  });

  it('should handle object syntax', () => {
    expect(cn({ 'class1': true, 'class2': false })).toBe('class1');
  });

  it('should handle mixed inputs', () => {
    expect(cn('class1', ['class2', 'class3'], { 'class4': true, 'class5': false }))
      .toBe('class1 class2 class3 class4');
  });

  it('should properly merge Tailwind classes', () => {
    // Tailwind-merge should intelligently combine classes
    expect(cn('p-4', 'p-5')).toBe('p-5');
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
    expect(cn('bg-red-500', 'bg-opacity-50')).toBe('bg-red-500 bg-opacity-50');
  });

  it('should handle undefined and null values', () => {
    expect(cn('class1', undefined, null, 'class2')).toBe('class1 class2');
  });

  it('should handle empty strings', () => {
    expect(cn('class1', '', 'class2')).toBe('class1 class2');
  });
});
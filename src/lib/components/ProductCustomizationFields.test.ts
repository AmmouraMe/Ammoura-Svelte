import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import ProductCustomizationFields from './ProductCustomizationFields.svelte';
import type { ProductCustomizationField } from '$lib/types/customization';

const textField: ProductCustomizationField = {
  id: 'field-1',
  productId: 'prod-1',
  name: 'Engraving Text',
  fieldType: 'text',
  options: [],
  placeholder: 'Enter text to engrave',
  required: true,
  maxLength: 30,
  minValue: null,
  maxValue: null,
  defaultValue: null,
  priceModifier: 5,
  sortOrder: 0,
  mediaRequirements: null
};

const selectField: ProductCustomizationField = {
  id: 'field-2',
  productId: 'prod-1',
  name: 'Font Style',
  fieldType: 'select',
  options: ['Arial', 'Times New Roman', 'Helvetica'],
  placeholder: null,
  required: false,
  maxLength: null,
  minValue: null,
  maxValue: null,
  defaultValue: 'Arial',
  priceModifier: 0,
  sortOrder: 1,
  mediaRequirements: null
};

const colorField: ProductCustomizationField = {
  id: 'field-3',
  productId: 'prod-1',
  name: 'Background Color',
  fieldType: 'color',
  options: [],
  placeholder: null,
  required: false,
  maxLength: null,
  minValue: null,
  maxValue: null,
  defaultValue: '#ff0000',
  priceModifier: 2,
  sortOrder: 2,
  mediaRequirements: null
};

const numberField: ProductCustomizationField = {
  id: 'field-4',
  productId: 'prod-1',
  name: 'Repeat Count',
  fieldType: 'number',
  options: [],
  placeholder: 'How many?',
  required: true,
  maxLength: null,
  minValue: 1,
  maxValue: 10,
  defaultValue: '1',
  priceModifier: 0.5,
  sortOrder: 3,
  mediaRequirements: null
};

const textareaField: ProductCustomizationField = {
  id: 'field-5',
  productId: 'prod-1',
  name: 'Special Instructions',
  fieldType: 'textarea',
  options: [],
  placeholder: 'Any special requests?',
  required: false,
  maxLength: 200,
  minValue: null,
  maxValue: null,
  defaultValue: null,
  priceModifier: 0,
  sortOrder: 4,
  mediaRequirements: null
};

const imageField: ProductCustomizationField = {
  id: 'field-6',
  productId: 'prod-1',
  name: 'Upload Design',
  fieldType: 'image',
  options: [],
  placeholder: null,
  required: true,
  maxLength: null,
  minValue: null,
  maxValue: null,
  defaultValue: null,
  priceModifier: 10,
  sortOrder: 5,
  mediaRequirements: {
    maxFileSize: 5242880,
    allowedMimeTypes: ['image/png', 'image/jpeg'],
    minWidth: 800,
    minHeight: 600
  }
};

const audioField: ProductCustomizationField = {
  id: 'field-7',
  productId: 'prod-1',
  name: 'Voice Message',
  fieldType: 'audio',
  options: [],
  placeholder: null,
  required: false,
  maxLength: null,
  minValue: null,
  maxValue: null,
  defaultValue: null,
  priceModifier: 15,
  sortOrder: 6,
  mediaRequirements: {
    maxFileSize: 10485760,
    minDuration: 5,
    maxDuration: 60,
    minBitrate: 128
  }
};

const videoField: ProductCustomizationField = {
  id: 'field-8',
  productId: 'prod-1',
  name: 'Product Video',
  fieldType: 'video',
  options: [],
  placeholder: null,
  required: false,
  maxLength: null,
  minValue: null,
  maxValue: null,
  defaultValue: null,
  priceModifier: 20,
  sortOrder: 7,
  mediaRequirements: {
    maxFileSize: 104857600,
    minDuration: 3,
    maxDuration: 120,
    minResolution: 720,
    minFrameRate: 24
  }
};

const imageFieldNoReqs: ProductCustomizationField = {
  id: 'field-9',
  productId: 'prod-1',
  name: 'Any Photo',
  fieldType: 'image',
  options: [],
  placeholder: null,
  required: false,
  maxLength: null,
  minValue: null,
  maxValue: null,
  defaultValue: null,
  priceModifier: 0,
  sortOrder: 8,
  mediaRequirements: null
};

describe('ProductCustomizationFields', () => {
  it('renders the heading', () => {
    render(ProductCustomizationFields, { props: { fields: [textField] } });
    expect(screen.getByText('Personalize Your Product')).toBeInTheDocument();
  });

  it('renders a text field with label and placeholder', () => {
    render(ProductCustomizationFields, { props: { fields: [textField] } });
    expect(screen.getByLabelText(/Engraving Text/)).toBeInTheDocument();
    const input = screen.getByPlaceholderText('Enter text to engrave');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('maxlength', '30');
  });

  it('shows required marker for required fields', () => {
    render(ProductCustomizationFields, { props: { fields: [textField] } });
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('shows price modifier for fields with extra cost', () => {
    render(ProductCustomizationFields, { props: { fields: [textField] } });
    expect(screen.getByText('+$5.00')).toBeInTheDocument();
  });

  it('renders a select field with options', () => {
    render(ProductCustomizationFields, { props: { fields: [selectField] } });
    expect(screen.getByLabelText(/Font Style/)).toBeInTheDocument();
    expect(screen.getByText('Arial')).toBeInTheDocument();
    expect(screen.getByText('Times New Roman')).toBeInTheDocument();
    expect(screen.getByText('Helvetica')).toBeInTheDocument();
  });

  it('renders non-required select with empty option', () => {
    render(ProductCustomizationFields, { props: { fields: [selectField] } });
    expect(screen.getByText('— Select —')).toBeInTheDocument();
  });

  it('renders a color field with color input', () => {
    render(ProductCustomizationFields, { props: { fields: [colorField] } });
    expect(screen.getByLabelText(/Background Color/)).toBeInTheDocument();
    const colorInput = document.querySelector('input[type="color"]');
    expect(colorInput).toBeInTheDocument();
  });

  it('renders a number field with min/max', () => {
    render(ProductCustomizationFields, { props: { fields: [numberField] } });
    const input = screen.getByPlaceholderText('How many?');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('min', '1');
    expect(input).toHaveAttribute('max', '10');
  });

  it('renders a textarea field', () => {
    render(ProductCustomizationFields, { props: { fields: [textareaField] } });
    const textarea = screen.getByPlaceholderText('Any special requests?');
    expect(textarea).toBeInTheDocument();
    expect(textarea.tagName.toLowerCase()).toBe('textarea');
  });

  it('shows character count for text fields with maxLength', () => {
    render(ProductCustomizationFields, { props: { fields: [textField] } });
    expect(screen.getByText('0/30')).toBeInTheDocument();
  });

  it('renders multiple fields', () => {
    render(ProductCustomizationFields, {
      props: { fields: [textField, selectField, colorField] }
    });
    expect(screen.getByLabelText(/Engraving Text/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Font Style/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Background Color/)).toBeInTheDocument();
  });

  it('shows required notice when required fields are not filled', () => {
    render(ProductCustomizationFields, { props: { fields: [textField] } });
    expect(
      screen.getByText('Please fill in all required fields before adding to cart')
    ).toBeInTheDocument();
  });

  it('renders with initial values', () => {
    render(ProductCustomizationFields, {
      props: {
        fields: [textField],
        initialValues: [
          {
            fieldId: 'field-1',
            fieldName: 'Engraving Text',
            fieldType: 'text',
            value: 'Hello World',
            priceModifier: 5
          }
        ]
      }
    });
    const input = screen.getByPlaceholderText('Enter text to engrave') as HTMLInputElement;
    expect(input.value).toBe('Hello World');
  });

  it('renders an image upload field with requirements', () => {
    render(ProductCustomizationFields, { props: { fields: [imageField] } });
    expect(screen.getByLabelText(/Upload Design/)).toBeInTheDocument();
    const fileInput = document.querySelector('input[type="file"]');
    expect(fileInput).toBeInTheDocument();
    expect(fileInput).toHaveAttribute('accept', 'image/png,image/jpeg');
    expect(screen.getByText(/Max file size: 5.0 MB/)).toBeInTheDocument();
    expect(screen.getByText(/Min: 800×600px/)).toBeInTheDocument();
  });

  it('renders an audio upload field with requirements', () => {
    render(ProductCustomizationFields, { props: { fields: [audioField] } });
    expect(screen.getByLabelText(/Voice Message/)).toBeInTheDocument();
    const fileInput = document.querySelector('input[type="file"]');
    expect(fileInput).toBeInTheDocument();
    expect(screen.getByText(/Duration: min 5s, max 60s/)).toBeInTheDocument();
    expect(screen.getByText(/Min bitrate: 128 kbps/)).toBeInTheDocument();
  });

  it('renders a video upload field with requirements', () => {
    render(ProductCustomizationFields, { props: { fields: [videoField] } });
    expect(screen.getByLabelText(/Product Video/)).toBeInTheDocument();
    const fileInput = document.querySelector('input[type="file"]');
    expect(fileInput).toBeInTheDocument();
    expect(screen.getByText(/Min resolution: 720p/)).toBeInTheDocument();
    expect(screen.getByText(/Min frame rate: 24 fps/)).toBeInTheDocument();
  });

  it('renders an image upload field without requirements', () => {
    render(ProductCustomizationFields, { props: { fields: [imageFieldNoReqs] } });
    expect(screen.getByLabelText(/Any Photo/)).toBeInTheDocument();
    const fileInput = document.querySelector('input[type="file"]');
    expect(fileInput).toBeInTheDocument();
    expect(fileInput).toHaveAttribute('accept', 'image/*');
  });

  it('renders media fields alongside traditional fields', () => {
    render(ProductCustomizationFields, {
      props: { fields: [textField, imageField, audioField] }
    });
    expect(screen.getByLabelText(/Engraving Text/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Upload Design/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Voice Message/)).toBeInTheDocument();
  });
});

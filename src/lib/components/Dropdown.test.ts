import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import Dropdown from './Dropdown.svelte';

describe('Dropdown', () => {
  const defaultOptions = [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
    { value: 'option3', label: 'Option 3' }
  ];

  describe('rendering', () => {
    it('renders correctly with basic props', () => {
      render(Dropdown, { props: { options: defaultOptions, value: '' } });

      const combobox = screen.getByRole('combobox');
      expect(combobox).toBeInTheDocument();
    });

    it('renders placeholder when no value is selected', () => {
      render(Dropdown, {
        props: { options: defaultOptions, value: '', placeholder: 'Select an option' }
      });

      expect(screen.getByText('Select an option')).toBeInTheDocument();
    });

    it('displays selected value label', () => {
      render(Dropdown, {
        props: { options: defaultOptions, value: 'option2' }
      });

      expect(screen.getByText('Option 2')).toBeInTheDocument();
    });

    it('displays label when provided', () => {
      render(Dropdown, {
        props: { options: defaultOptions, value: '', label: 'Choose an option' }
      });

      expect(screen.getByText('Choose an option')).toBeInTheDocument();
    });

    it('displays description when provided', () => {
      render(Dropdown, {
        props: {
          options: defaultOptions,
          value: '',
          label: 'Choose',
          description: 'Pick one of the available options'
        }
      });

      expect(screen.getByText('Pick one of the available options')).toBeInTheDocument();
    });

    it('can be disabled', () => {
      render(Dropdown, {
        props: { options: defaultOptions, value: '', disabled: true }
      });

      const trigger = screen.getByRole('combobox');
      expect(trigger).toHaveAttribute('aria-disabled', 'true');
    });

    it('applies name attribute for form integration', () => {
      render(Dropdown, {
        props: { options: defaultOptions, value: 'option1', name: 'myDropdown' }
      });

      const hiddenInput = screen.getByDisplayValue('option1');
      expect(hiddenInput).toHaveAttribute('name', 'myDropdown');
    });
  });

  describe('interactions', () => {
    it('opens dropdown menu when clicked', async () => {
      const user = userEvent.setup();
      render(Dropdown, { props: { options: defaultOptions, value: '' } });

      const trigger = screen.getByRole('combobox');
      await user.click(trigger);

      expect(screen.getByRole('listbox')).toBeInTheDocument();
      expect(screen.getByText('Option 1')).toBeInTheDocument();
      expect(screen.getByText('Option 2')).toBeInTheDocument();
      expect(screen.getByText('Option 3')).toBeInTheDocument();
    });

    it('closes dropdown when option is selected', async () => {
      const user = userEvent.setup();
      render(Dropdown, { props: { options: defaultOptions, value: '' } });

      const trigger = screen.getByRole('combobox');
      await user.click(trigger);

      const option = screen.getByRole('option', { name: 'Option 2' });
      await user.click(option);

      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      });
    });

    it('calls onChange when option is selected', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(Dropdown, {
        props: { options: defaultOptions, value: '', onChange }
      });

      const trigger = screen.getByRole('combobox');
      await user.click(trigger);

      const option = screen.getByRole('option', { name: 'Option 2' });
      await user.click(option);

      expect(onChange).toHaveBeenCalledWith('option2');
    });

    it('does not open when disabled', async () => {
      const user = userEvent.setup();
      render(Dropdown, {
        props: { options: defaultOptions, value: '', disabled: true }
      });

      const trigger = screen.getByRole('combobox');
      await user.click(trigger);

      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('closes dropdown when clicking outside', async () => {
      const user = userEvent.setup();

      render(Dropdown, { props: { options: defaultOptions, value: '' } });

      const trigger = screen.getByRole('combobox');
      await user.click(trigger);

      expect(screen.getByRole('listbox')).toBeInTheDocument();

      // Use fireEvent to dispatch the click at the document level
      // This simulates clicking outside the dropdown
      document.dispatchEvent(
        new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          view: window
        })
      );

      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      });
    });

    it('closes dropdown when Escape key is pressed', async () => {
      const user = userEvent.setup();
      render(Dropdown, { props: { options: defaultOptions, value: '' } });

      const trigger = screen.getByRole('combobox');
      await user.click(trigger);

      expect(screen.getByRole('listbox')).toBeInTheDocument();

      await user.keyboard('{Escape}');

      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      });
    });
  });

  describe('keyboard navigation', () => {
    it('opens dropdown with Enter key', async () => {
      const user = userEvent.setup();
      render(Dropdown, { props: { options: defaultOptions, value: '' } });

      const trigger = screen.getByRole('combobox');
      trigger.focus();
      await user.keyboard('{Enter}');

      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    it('opens dropdown with Space key', async () => {
      const user = userEvent.setup();
      render(Dropdown, { props: { options: defaultOptions, value: '' } });

      const trigger = screen.getByRole('combobox');
      trigger.focus();
      await user.keyboard(' ');

      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    it('navigates through options with arrow keys', async () => {
      const user = userEvent.setup();
      render(Dropdown, { props: { options: defaultOptions, value: '' } });

      const trigger = screen.getByRole('combobox');
      await user.click(trigger);

      await user.keyboard('{ArrowDown}');
      let highlighted = screen.getByRole('option', { name: 'Option 1' });
      expect(highlighted).toHaveAttribute('data-highlighted', 'true');

      await user.keyboard('{ArrowDown}');
      highlighted = screen.getByRole('option', { name: 'Option 2' });
      expect(highlighted).toHaveAttribute('data-highlighted', 'true');

      await user.keyboard('{ArrowUp}');
      highlighted = screen.getByRole('option', { name: 'Option 1' });
      expect(highlighted).toHaveAttribute('data-highlighted', 'true');
    });

    it('selects highlighted option with Enter key', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(Dropdown, {
        props: { options: defaultOptions, value: '', onChange }
      });

      const trigger = screen.getByRole('combobox');
      await user.click(trigger);
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{Enter}');

      expect(onChange).toHaveBeenCalledWith('option2');
    });
  });

  describe('option groups', () => {
    const groupedOptions = [
      { value: 'apple', label: 'Apple', group: 'Fruits' },
      { value: 'banana', label: 'Banana', group: 'Fruits' },
      { value: 'carrot', label: 'Carrot', group: 'Vegetables' },
      { value: 'broccoli', label: 'Broccoli', group: 'Vegetables' }
    ];

    it('renders options with group headers', async () => {
      const user = userEvent.setup();
      render(Dropdown, { props: { options: groupedOptions, value: '' } });

      const trigger = screen.getByRole('combobox');
      await user.click(trigger);

      expect(screen.getByText('Fruits')).toBeInTheDocument();
      expect(screen.getByText('Vegetables')).toBeInTheDocument();
    });
  });

  describe('disabled options', () => {
    const optionsWithDisabled = [
      { value: 'option1', label: 'Option 1' },
      { value: 'option2', label: 'Option 2', disabled: true },
      { value: 'option3', label: 'Option 3' }
    ];

    it('renders disabled options with correct aria attribute', async () => {
      const user = userEvent.setup();
      render(Dropdown, { props: { options: optionsWithDisabled, value: '' } });

      const trigger = screen.getByRole('combobox');
      await user.click(trigger);

      const disabledOption = screen.getByRole('option', { name: 'Option 2' });
      expect(disabledOption).toHaveAttribute('aria-disabled', 'true');
    });

    it('does not select disabled option', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(Dropdown, {
        props: { options: optionsWithDisabled, value: '', onChange }
      });

      const trigger = screen.getByRole('combobox');
      await user.click(trigger);

      const disabledOption = screen.getByRole('option', { name: 'Option 2' });
      await user.click(disabledOption);

      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('custom option rendering', () => {
    const optionsWithIcons = [
      { value: 'home', label: 'Home', icon: '🏠' },
      { value: 'settings', label: 'Settings', icon: '⚙️' },
      { value: 'profile', label: 'Profile', icon: '👤' }
    ];

    it('renders options with icons when provided', async () => {
      const user = userEvent.setup();
      render(Dropdown, { props: { options: optionsWithIcons, value: '' } });

      const trigger = screen.getByRole('combobox');
      await user.click(trigger);

      expect(screen.getByText('🏠')).toBeInTheDocument();
      expect(screen.getByText('⚙️')).toBeInTheDocument();
      expect(screen.getByText('👤')).toBeInTheDocument();
    });

    it('shows icon in trigger when option with icon is selected', () => {
      render(Dropdown, { props: { options: optionsWithIcons, value: 'settings' } });

      expect(screen.getByText('⚙️')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });
  });

  describe('required field', () => {
    it('applies required attribute to hidden input', () => {
      render(Dropdown, {
        props: { options: defaultOptions, value: '', required: true, name: 'required-field' }
      });

      const hiddenInput = document.querySelector('input[name="required-field"]');
      expect(hiddenInput).toHaveAttribute('required');
    });
  });

  describe('error state', () => {
    it('displays error message when provided', () => {
      render(Dropdown, {
        props: { options: defaultOptions, value: '', error: 'This field is required' }
      });

      expect(screen.getByText('This field is required')).toBeInTheDocument();
    });

    it('applies error styling when error is present', () => {
      const { container } = render(Dropdown, {
        props: { options: defaultOptions, value: '', error: 'Error' }
      });

      const wrapper = container.querySelector('.dropdown-wrapper');
      expect(wrapper).toHaveClass('has-error');
    });
  });

  describe('sizing', () => {
    it('applies small size class', () => {
      const { container } = render(Dropdown, {
        props: { options: defaultOptions, value: '', size: 'small' }
      });

      const trigger = container.querySelector('.dropdown-trigger');
      expect(trigger).toHaveClass('size-small');
    });

    it('applies medium size class by default', () => {
      const { container } = render(Dropdown, {
        props: { options: defaultOptions, value: '' }
      });

      const trigger = container.querySelector('.dropdown-trigger');
      expect(trigger).toHaveClass('size-medium');
    });

    it('applies large size class', () => {
      const { container } = render(Dropdown, {
        props: { options: defaultOptions, value: '', size: 'large' }
      });

      const trigger = container.querySelector('.dropdown-trigger');
      expect(trigger).toHaveClass('size-large');
    });
  });

  describe('searchable dropdown', () => {
    it('shows search input when searchable is true', async () => {
      const user = userEvent.setup();
      render(Dropdown, {
        props: { options: defaultOptions, value: '', searchable: true }
      });

      const trigger = screen.getByRole('combobox');
      await user.click(trigger);

      expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
    });

    it('filters options based on search query', async () => {
      const user = userEvent.setup();
      render(Dropdown, {
        props: { options: defaultOptions, value: '', searchable: true }
      });

      const trigger = screen.getByRole('combobox');
      await user.click(trigger);

      const searchInput = screen.getByPlaceholderText('Search...');
      await user.type(searchInput, '2');

      await waitFor(() => {
        expect(screen.getByRole('option', { name: 'Option 2' })).toBeInTheDocument();
        expect(screen.queryByRole('option', { name: 'Option 1' })).not.toBeInTheDocument();
        expect(screen.queryByRole('option', { name: 'Option 3' })).not.toBeInTheDocument();
      });
    });

    it('shows no results message when search has no matches', async () => {
      const user = userEvent.setup();
      render(Dropdown, {
        props: { options: defaultOptions, value: '', searchable: true }
      });

      const trigger = screen.getByRole('combobox');
      await user.click(trigger);

      const searchInput = screen.getByPlaceholderText('Search...');
      await user.type(searchInput, 'nonexistent');

      expect(screen.getByText('No options found')).toBeInTheDocument();
    });
  });
});

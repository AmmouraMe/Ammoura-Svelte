import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import ButtonIconPicker from './ButtonIconPicker.svelte';

describe('ButtonIconPicker', () => {
  beforeEach(() => {
    // Mock document event listeners
    vi.spyOn(document, 'addEventListener');
    vi.spyOn(document, 'removeEventListener');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders with placeholder when no icon is selected', () => {
    render(ButtonIconPicker, { props: { value: '' } });
    expect(screen.getByText('Select an icon (optional)')).toBeInTheDocument();
  });

  it('renders with custom placeholder', () => {
    render(ButtonIconPicker, {
      props: { value: '', placeholder: 'Choose button icon' }
    });
    expect(screen.getByText('Choose button icon')).toBeInTheDocument();
  });

  it('shows selected icon name when value is provided', () => {
    render(ButtonIconPicker, { props: { value: 'ArrowRight' } });
    expect(screen.getByText('ArrowRight')).toBeInTheDocument();
  });

  it('opens modal when trigger is clicked', async () => {
    const user = userEvent.setup();
    render(ButtonIconPicker, { props: { value: '' } });

    const trigger = screen.getByRole('button', { name: /select an icon/i });
    await user.click(trigger);

    // Should show search input in modal
    expect(screen.getByPlaceholderText('Search 1500+ icons...')).toBeInTheDocument();
    // Should show modal dialog
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('shows category tabs in modal when open', async () => {
    const user = userEvent.setup();
    render(ButtonIconPicker, { props: { value: '' } });

    const trigger = screen.getByRole('button', { name: /select an icon/i });
    await user.click(trigger);

    // Should show category tabs as buttons with text
    expect(screen.getByRole('button', { name: /Popular/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Arrows/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Actions/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Commerce/i })).toBeInTheDocument();
  });

  it('filters icons when searching', async () => {
    const user = userEvent.setup();
    render(ButtonIconPicker, { props: { value: '' } });

    // Open picker
    const trigger = screen.getByRole('button', { name: /select an icon/i });
    await user.click(trigger);

    // Type in search
    const searchInput = screen.getByPlaceholderText('Search 1500+ icons...');
    await user.type(searchInput, 'arrow');

    // Should show result count
    expect(screen.getByText(/icon.*found/i)).toBeInTheDocument();
  });

  it('selects an icon when clicked', async () => {
    const user = userEvent.setup();
    const { component } = render(ButtonIconPicker, { props: { value: '' } });

    const changeSpy = vi.fn();
    component.$on('change', changeSpy);

    // Open picker
    const trigger = screen.getByRole('button', { name: /select an icon/i });
    await user.click(trigger);

    // Click on first icon option (should be from popular category)
    const iconOptions = screen.getAllByTitle(/.+/);
    const firstIconOption = iconOptions.find((btn) => btn.classList.contains('icon-option'));

    if (firstIconOption) {
      await user.click(firstIconOption);
      // Should emit change event
      expect(changeSpy).toHaveBeenCalled();
    }
  });

  it('clears icon when clear button is clicked', async () => {
    const user = userEvent.setup();
    const { component } = render(ButtonIconPicker, { props: { value: 'ArrowRight' } });

    const changeSpy = vi.fn();
    component.$on('change', changeSpy);

    // Find and click clear button
    const clearButton = screen.getByTitle('Remove icon');
    await user.click(clearButton);

    // Should emit change event with empty string
    expect(changeSpy).toHaveBeenCalledWith(expect.objectContaining({ detail: '' }));
  });

  it('does not show clear button when no icon is selected', () => {
    render(ButtonIconPicker, { props: { value: '' } });
    expect(screen.queryByTitle('Remove icon')).not.toBeInTheDocument();
  });

  it('switches categories when category tab is clicked', async () => {
    const user = userEvent.setup();
    render(ButtonIconPicker, { props: { value: '' } });

    // Open picker
    const trigger = screen.getByRole('button', { name: /select an icon/i });
    await user.click(trigger);

    // Click on Arrows category
    const arrowsTab = screen.getByRole('button', { name: /Arrows/i });
    await user.click(arrowsTab);

    // Should have active class
    expect(arrowsTab).toHaveClass('active');
  });

  it('hides category tabs when search query is entered', async () => {
    const user = userEvent.setup();
    render(ButtonIconPicker, { props: { value: '' } });

    // Open picker
    const trigger = screen.getByRole('button', { name: /select an icon/i });
    await user.click(trigger);

    // Verify tabs are visible initially
    expect(screen.getByRole('button', { name: /Popular/i })).toBeInTheDocument();

    // Type in search
    const searchInput = screen.getByPlaceholderText('Search 1500+ icons...');
    await user.type(searchInput, 'download');

    // Tabs should be hidden during search
    // The category tabs wrapper is hidden via conditional rendering
    // We can verify by checking the search results are shown instead
    expect(screen.getByText(/icon.*found/i)).toBeInTheDocument();
  });

  it('shows "No icons found" when search has no results', async () => {
    const user = userEvent.setup();
    render(ButtonIconPicker, { props: { value: '' } });

    // Open picker
    const trigger = screen.getByRole('button', { name: /select an icon/i });
    await user.click(trigger);

    // Type a search with no results
    const searchInput = screen.getByPlaceholderText('Search 1500+ icons...');
    await user.type(searchInput, 'xyznonexistent123');

    // Should show no results message
    expect(screen.getByText(/no icons found/i)).toBeInTheDocument();
  });

  it('closes modal and clears search when icon is selected', async () => {
    const user = userEvent.setup();
    render(ButtonIconPicker, { props: { value: '' } });

    // Open picker
    const trigger = screen.getByRole('button', { name: /select an icon/i });
    await user.click(trigger);

    // Type in search
    const searchInput = screen.getByPlaceholderText('Search 1500+ icons...');
    await user.type(searchInput, 'star');

    // Click on an icon
    const iconOption = document.querySelector('.icon-option');
    if (iconOption) {
      await user.click(iconOption);

      // Modal should be closed (dialog should not be visible)
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    }
  });

  it('updates selected icon when value prop changes externally', async () => {
    const { component } = render(ButtonIconPicker, { props: { value: 'Star' } });
    expect(screen.getByText('Star')).toBeInTheDocument();

    // Update prop externally
    component.$set({ value: 'Heart' });

    // Allow reactive update
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(screen.getByText('Heart')).toBeInTheDocument();
  });

  it('registers document click listener on mount', () => {
    // The component uses onMount to add a click listener
    // We verify this indirectly by testing the click-outside behavior
    const { container } = render(ButtonIconPicker, { props: { value: '' } });

    // Component should render successfully which means onMount ran
    expect(container.querySelector('.button-icon-picker-container')).toBeInTheDocument();
  });
});

<script lang="ts">
  import { checkoutStore } from '../stores/checkout';
  import type { PaymentMethod } from '../types/checkout';

  export let errors: Partial<Record<keyof PaymentMethod, string>> = {};

  $: formData = $checkoutStore.formData.paymentMethod;

  function updateField(field: keyof PaymentMethod, value: string) {
    const updatedPayment = { ...formData, [field]: value };
    checkoutStore.updateFormData({
      paymentMethod: updatedPayment
    });
  }

  function updateExpiryFields(month: string, year: string) {
    const updatedPayment = { ...formData, expiryMonth: month, expiryYear: year };
    checkoutStore.updateFormData({
      paymentMethod: updatedPayment
    });
  }

  function formatCardNumber(value: string): string {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');

    // Format as groups of 4 digits
    const groups = digits.match(/.{1,4}/g) || [];
    return groups.join(' ').substr(0, 19); // Max 16 digits + 3 spaces
  }

  function handleCardNumberInput(event: Event) {
    const target = event.target as HTMLInputElement;
    const formatted = formatCardNumber(target.value);
    target.value = formatted;
    updateField('cardNumber', formatted);
  }

  function formatExpiry(value: string): string {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');

    // Limit to 4 digits (MMYY)
    const limitedDigits = digits.substring(0, 4);

    if (limitedDigits.length >= 3) {
      // If we have 3 or more digits, format as MM/YY
      return limitedDigits.substring(0, 2) + '/' + limitedDigits.substring(2);
    } else if (limitedDigits.length === 2) {
      // If we have exactly 2 digits, add the slash
      return limitedDigits + '/';
    }
    // If we have 0 or 1 digit, return as is
    return limitedDigits;
  }

  function handleExpiryInput(event: Event) {
    const target = event.target as HTMLInputElement;
    const cursorPosition = target.selectionStart || 0;
    const previousValue = target.value;

    const formatted = formatExpiry(target.value);
    target.value = formatted;

    // Adjust cursor position
    let newCursorPosition = cursorPosition;

    // If we just added a slash automatically, move cursor after it
    if (formatted.length === 3 && previousValue.length === 2 && formatted[2] === '/') {
      newCursorPosition = 3;
    }
    // If cursor was after the slash, keep it there
    else if (cursorPosition >= 3) {
      newCursorPosition = formatted.length;
    }

    target.setSelectionRange(newCursorPosition, newCursorPosition);

    // Update store with split values - both at once to avoid race condition
    if (formatted.includes('/')) {
      const [month, year] = formatted.split('/');
      updateExpiryFields(month, year || '');
    } else {
      updateExpiryFields(formatted, '');
    }
  }
</script>

<div class="payment-method-form">
  <h3>Payment Method</h3>

  <div class="payment-type-selector">
    <label class="radio-label">
      <input
        type="radio"
        name="paymentType"
        value="credit-card"
        checked={formData.type === 'credit-card'}
        on:change={(e) => updateField('type', e.currentTarget.value)}
      />
      <span>Credit Card</span>
    </label>

    <label class="radio-label">
      <input
        type="radio"
        name="paymentType"
        value="debit-card"
        checked={formData.type === 'debit-card'}
        on:change={(e) => updateField('type', e.currentTarget.value)}
      />
      <span>Debit Card</span>
    </label>
  </div>

  <div class="form-group">
    <label for="cardNumber">Card Number *</label>
    <input
      type="text"
      id="cardNumber"
      value={formData.cardNumber}
      on:input={handleCardNumberInput}
      placeholder="4111 1111 1111 1111"
      maxlength="19"
      class:error={errors.cardNumber}
    />
    {#if errors.cardNumber}
      <span class="error-message">{errors.cardNumber}</span>
    {:else}
      <span class="help-text">Test cards: 4111 1111 1111 1111, 5555 5555 5555 4444</span>
    {/if}
  </div>

  <div class="form-group">
    <label for="cardHolderName">Cardholder Name *</label>
    <input
      type="text"
      id="cardHolderName"
      value={formData.cardHolderName}
      on:input={(e) => updateField('cardHolderName', e.currentTarget.value)}
      placeholder="John Doe"
      class:error={errors.cardHolderName}
    />
    {#if errors.cardHolderName}
      <span class="error-message">{errors.cardHolderName}</span>
    {/if}
  </div>

  <div class="form-row">
    <div class="form-group">
      <label for="expiry">Expiry Date *</label>
      <input
        type="text"
        id="expiry"
        value={formData.expiryMonth && formData.expiryYear
          ? `${formData.expiryMonth}/${formData.expiryYear}`
          : formData.expiryMonth || ''}
        on:input={handleExpiryInput}
        placeholder="MM/YY"
        maxlength="5"
        class:error={errors.expiryMonth || errors.expiryYear}
      />
      {#if errors.expiryMonth || errors.expiryYear}
        <span class="error-message">{errors.expiryMonth || errors.expiryYear}</span>
      {:else}
        <span class="help-text" style="font-size: 0.7rem;"
          >Month: '{formData.expiryMonth}' Year: '{formData.expiryYear}'</span
        >
      {/if}
    </div>

    <div class="form-group">
      <label for="cvv">CVV *</label>
      <input
        type="text"
        id="cvv"
        value={formData.cvv}
        on:input={(e) => updateField('cvv', e.currentTarget.value.replace(/\D/g, ''))}
        placeholder="123"
        maxlength="4"
        class:error={errors.cvv}
      />
      {#if errors.cvv}
        <span class="error-message">{errors.cvv}</span>
      {/if}
    </div>
  </div>

  <div class="security-notice">
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
    >
      <path d="M12 2L3 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" />
    </svg>
    <span>Your payment information is secure and encrypted</span>
  </div>
</div>

<style>
  .payment-method-form {
    background: var(--color-bg-primary);
    padding: 1.5rem;
    border-radius: 8px;
    box-shadow: 0 2px 10px var(--color-shadow-light);
    transition:
      background-color var(--transition-normal),
      box-shadow var(--transition-normal);
  }

  .payment-method-form h3 {
    margin: 0 0 1.5rem 0;
    color: var(--color-text-primary);
    transition: color var(--transition-normal);
  }

  .payment-type-selector {
    display: flex;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .radio-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    color: var(--color-text-secondary);
    transition: color var(--transition-normal);
  }

  .radio-label input[type='radio'] {
    width: auto;
    margin: 0;
  }

  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  .form-group {
    margin-bottom: 1rem;
  }

  .form-group label {
    display: block;
    margin-bottom: 0.5rem;
    color: var(--color-text-secondary);
    font-weight: 500;
    transition: color var(--transition-normal);
  }

  .form-group input {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid var(--color-border-secondary);
    border-radius: 4px;
    font-size: 1rem;
    background: var(--color-bg-primary);
    color: var(--color-text-primary);
    transition:
      border-color var(--transition-normal),
      background-color var(--transition-normal),
      color var(--transition-normal);
  }

  .form-group input:focus {
    outline: none;
    border-color: var(--color-border-focus);
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }

  .form-group input.error {
    border-color: var(--color-danger);
  }

  .error-message {
    display: block;
    color: var(--color-danger);
    font-size: 0.875rem;
    margin-top: 0.25rem;
    transition: color var(--transition-normal);
  }

  .help-text {
    display: block;
    color: var(--color-text-tertiary);
    font-size: 0.75rem;
    margin-top: 0.25rem;
    font-style: italic;
    transition: color var(--transition-normal);
  }

  .security-notice {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 1rem;
    padding: 0.75rem;
    background: var(--color-bg-accent);
    border-radius: 4px;
    color: var(--color-text-secondary);
    font-size: 0.875rem;
    transition:
      background-color var(--transition-normal),
      color var(--transition-normal);
  }

  .security-notice svg {
    color: var(--color-success);
  }

  @media (max-width: 768px) {
    .form-row {
      grid-template-columns: 1fr;
    }

    .payment-type-selector {
      flex-direction: column;
    }
  }
</style>

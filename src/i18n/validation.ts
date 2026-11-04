import { setLocale } from 'yup'

// Keep source messages in English. Render-time translation lets existing errors
// switch languages immediately, just like labels and other interface messages.
setLocale({
  mixed: {
    default: 'Enter a valid value.',
    required: 'This field is required.',
    notType: 'Enter a valid value.',
    oneOf: 'Choose a valid option.',
    notOneOf: 'Choose a valid option.',
  },
  string: {
    email: 'Enter a valid email address.',
    min: 'Check the length of this value.',
    max: 'Check the length of this value.',
    length: 'Check the length of this value.',
    url: 'Enter a valid value.',
  },
  number: {
    min: 'Enter a larger value.',
    max: 'Enter a smaller value.',
    positive: 'Must be greater than zero.',
    integer: 'Enter a whole number.',
  },
  array: { min: 'Check the number of items.', max: 'Check the number of items.' },
})

import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faShoppingCart,
  faMagnifyingGlass,
  faUser,
  faBars,
  faXmark,
  faCheck,
  faPlus,
  faMinus,
  faStar,
  faArrowRight,
  faChevronRight,
  faChevronDown,
  faTruckFast,
  faShieldHalved,
  faCapsules,
  faFlask,
  faLeaf,
  faMoneyBillWave,
  faRotateLeft,
  faEye,
  faEyeSlash,
  faPhone,
  faEnvelope,
  faLocationDot,
  faSpinner,
  faCircleExclamation,
  faLock,
  faTrashCan,
  faClock,
  faCalendarDays,
  faBox,
  faArrowLeft,
  faCopy,
  faBolt,
  faCircleInfo,
  faTag,
  faHeart,
  faSliders,
  faFileInvoice,
  faDownload,
  faUpload,
  faPrint,
  faChartLine,
  faCertificate,
  faAward,
  faLanguage,
} from '@fortawesome/free-solid-svg-icons';

import {
  faStar as faStarRegular,
} from '@fortawesome/free-regular-svg-icons';

import {
  faWhatsapp,
  faFacebook,
  faInstagram,
  faTiktok,
} from '@fortawesome/free-brands-svg-icons';

const ICON_MAP = {
  cart: faShoppingCart,
  search: faMagnifyingGlass,
  user: faUser,
  bars: faBars,
  close: faXmark,
  check: faCheck,
  plus: faPlus,
  minus: faMinus,
  star: faStar,
  'star-outline': faStarRegular,
  'arrow-right': faArrowRight,
  'chevron-right': faChevronRight,
  'chevron-down': faChevronDown,
  truck: faTruckFast,
  shield: faShieldHalved,
  certificate: faCertificate,
  award: faAward,
  capsules: faCapsules,
  flask: faFlask,
  leaf: faLeaf,
  cod: faMoneyBillWave,
  returns: faRotateLeft,
  eye: faEye,
  'eye-slash': faEyeSlash,
  phone: faPhone,
  envelope: faEnvelope,
  location: faLocationDot,
  spinner: faSpinner,
  exclamation: faCircleExclamation,
  lock: faLock,
  trash: faTrashCan,
  clock: faClock,
  calendar: faCalendarDays,
  box: faBox,
  'arrow-left': faArrowLeft,
  copy: faCopy,
  bolt: faBolt,
  info: faCircleInfo,
  tag: faTag,
  heart: faHeart,
  sliders: faSliders,
  invoice: faFileInvoice,
  download: faDownload,
  upload: faUpload,
  print: faPrint,
  chart: faChartLine,
  whatsapp: faWhatsapp,
  facebook: faFacebook,
  instagram: faInstagram,
  tiktok: faTiktok,
  language: faLanguage,
};

/**
 * Accessible, self-hosted FontAwesome Icon component.
 * Decorative icons automatically receive aria-hidden="true".
 * Icon-only buttons or interactive elements receive accessible sr-only text via `label`.
 */
export default function Icon({ name, className = '', label, spin = false, ...props }) {
  const iconDefinition = ICON_MAP[name] || faCapsules;

  return (
    <span className="inline-flex items-center justify-center">
      <FontAwesomeIcon
        icon={iconDefinition}
        className={className}
        spin={spin}
        aria-hidden={label ? undefined : 'true'}
        {...props}
      />
      {label && <span className="sr-only">{label}</span>}
    </span>
  );
}

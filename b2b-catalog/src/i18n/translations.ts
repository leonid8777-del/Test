export type Language = 'de' | 'en' | 'ru';

export const translations = {
  de: {
    catalog: {
      title: 'Angebotskatalog',
      search: 'Suche nach Titel, Artikelnummer, Marke...',
      allCategories: 'Alle Kategorien',
      allConditions: 'Alle Zustände',
      noResults: 'Keine Angebote gefunden.',
      addToCart: 'Anfrage hinzufügen',
      quantity: 'Menge',
      available: 'verfügbar',
      pricePerUnit: 'Preis/Einheit',
      articleNumber: 'Art.Nr.',
      condition: 'Zustand',
      category: 'Kategorie',
      brand: 'Marke',
      unit: 'Einheit',
      exportOnly: 'Nur Export',
      details: 'Details',
      backToCatalog: 'Zurück zum Katalog',
      partialSale: 'Teilverkauf möglich',
    },
    cart: {
      title: 'Anfrage-Warenkorb',
      empty: 'Ihr Warenkorb ist leer.',
      remove: 'Entfernen',
      requestedQty: 'Gewünschte Menge',
      sendInquiry: 'Anfrage senden',
      continueBrowsing: 'Weiter stöbern',
      items: 'Artikel',
    },
    inquiry: {
      title: 'Anfrage senden',
      name: 'Name',
      email: 'E-Mail',
      phone: 'Telefon',
      company: 'Firma',
      message: 'Nachricht (optional)',
      submit: 'Anfrage absenden',
      sendViaWhatsApp: 'Auch per WhatsApp senden',
      success: 'Anfrage erfolgreich gesendet!',
      successMessage: 'Wir werden uns in Kürze bei Ihnen melden.',
      backToCatalog: 'Zurück zum Katalog',
    },
    conditions: {
      A: 'Neu / A-Ware',
      B: 'B-Ware',
      C: 'C-Ware',
      D: 'Beschädigt',
    },
    common: {
      loading: 'Laden...',
      error: 'Fehler aufgetreten',
      save: 'Speichern',
      cancel: 'Abbrechen',
      edit: 'Bearbeiten',
      delete: 'Löschen',
      confirm: 'Bestätigen',
      back: 'Zurück',
    },
  },
  en: {
    catalog: {
      title: 'Offer Catalog',
      search: 'Search by title, article number, brand...',
      allCategories: 'All Categories',
      allConditions: 'All Conditions',
      noResults: 'No offers found.',
      addToCart: 'Add to inquiry',
      quantity: 'Quantity',
      available: 'available',
      pricePerUnit: 'Price/unit',
      articleNumber: 'Art. No.',
      condition: 'Condition',
      category: 'Category',
      brand: 'Brand',
      unit: 'Unit',
      exportOnly: 'Export only',
      details: 'Details',
      backToCatalog: 'Back to catalog',
      partialSale: 'Partial sale possible',
    },
    cart: {
      title: 'Inquiry Cart',
      empty: 'Your cart is empty.',
      remove: 'Remove',
      requestedQty: 'Requested quantity',
      sendInquiry: 'Send inquiry',
      continueBrowsing: 'Continue browsing',
      items: 'items',
    },
    inquiry: {
      title: 'Send Inquiry',
      name: 'Name',
      email: 'Email',
      phone: 'Phone',
      company: 'Company',
      message: 'Message (optional)',
      submit: 'Submit inquiry',
      sendViaWhatsApp: 'Also send via WhatsApp',
      success: 'Inquiry sent successfully!',
      successMessage: 'We will get back to you shortly.',
      backToCatalog: 'Back to catalog',
    },
    conditions: {
      A: 'New / A-Grade',
      B: 'B-Grade',
      C: 'C-Grade',
      D: 'Damaged',
    },
    common: {
      loading: 'Loading...',
      error: 'An error occurred',
      save: 'Save',
      cancel: 'Cancel',
      edit: 'Edit',
      delete: 'Delete',
      confirm: 'Confirm',
      back: 'Back',
    },
  },
  ru: {
    catalog: {
      title: 'Каталог предложений',
      search: 'Поиск по названию, артикулу, бренду...',
      allCategories: 'Все категории',
      allConditions: 'Все состояния',
      noResults: 'Предложения не найдены.',
      addToCart: 'Добавить в запрос',
      quantity: 'Количество',
      available: 'в наличии',
      pricePerUnit: 'Цена/ед.',
      articleNumber: 'Арт.',
      condition: 'Состояние',
      category: 'Категория',
      brand: 'Бренд',
      unit: 'Единица',
      exportOnly: 'Только на экспорт',
      details: 'Подробнее',
      backToCatalog: 'Назад к каталогу',
      partialSale: 'Возможна частичная продажа',
    },
    cart: {
      title: 'Корзина запросов',
      empty: 'Ваша корзина пуста.',
      remove: 'Удалить',
      requestedQty: 'Запрашиваемое количество',
      sendInquiry: 'Отправить запрос',
      continueBrowsing: 'Продолжить просмотр',
      items: 'позиций',
    },
    inquiry: {
      title: 'Отправить запрос',
      name: 'Имя',
      email: 'Эл. почта',
      phone: 'Телефон',
      company: 'Компания',
      message: 'Сообщение (необязательно)',
      submit: 'Отправить запрос',
      sendViaWhatsApp: 'Также отправить через WhatsApp',
      success: 'Запрос успешно отправлен!',
      successMessage: 'Мы свяжемся с вами в ближайшее время.',
      backToCatalog: 'Назад к каталогу',
    },
    conditions: {
      A: 'Новый / Класс A',
      B: 'Класс B',
      C: 'Класс C',
      D: 'Повреждённый',
    },
    common: {
      loading: 'Загрузка...',
      error: 'Произошла ошибка',
      save: 'Сохранить',
      cancel: 'Отмена',
      edit: 'Редактировать',
      delete: 'Удалить',
      confirm: 'Подтвердить',
      back: 'Назад',
    },
  },
};

export interface TranslationKey {
  catalog: {
    title: string;
    search: string;
    allCategories: string;
    allConditions: string;
    noResults: string;
    addToCart: string;
    quantity: string;
    available: string;
    pricePerUnit: string;
    articleNumber: string;
    condition: string;
    category: string;
    brand: string;
    unit: string;
    exportOnly: string;
    details: string;
    backToCatalog: string;
    partialSale: string;
  };
  cart: {
    title: string;
    empty: string;
    remove: string;
    requestedQty: string;
    sendInquiry: string;
    continueBrowsing: string;
    items: string;
  };
  inquiry: {
    title: string;
    name: string;
    email: string;
    phone: string;
    company: string;
    message: string;
    submit: string;
    sendViaWhatsApp: string;
    success: string;
    successMessage: string;
    backToCatalog: string;
  };
  conditions: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  common: {
    loading: string;
    error: string;
    save: string;
    cancel: string;
    edit: string;
    delete: string;
    confirm: string;
    back: string;
  };
}

export function getTranslations(lang: Language): TranslationKey {
  return translations[lang] || translations.de;
}

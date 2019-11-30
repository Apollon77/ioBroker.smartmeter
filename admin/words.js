systemDictionary = {
    "page_title":   {"en": "Smartmeter Adapter Settings", "de": "Smartmeter Adapter Einstellungen"},

    "heading_GeneralSettings":   {"en": "General Settings", "de": "Generelle Einstellungen"},
    "heading_TransportSpecificSettings":   {"en": "Data Transfer Settings", "de": "Einstellungen Datenübertragung"},
    "heading_ProtocolSpecificSettings":   {"en": "Data Protocol Settings", "de": "Einstellungen Datenprotokoll"},

    "value_protocol_default":   {"en": "Protocol-/Transport-Default", "de": "Standard Protokoll/Übertragung"},
    "value_no_overwrite":   {"en": "Use Mode defined by device", "de": "Mode des Devices nutzen"},

    "field_protocol":   {"en": "Data Protocol", "de": "Daten-Protokoll"},
    "value_protocol_D0Protocol":   {"en": "D0 (WakeUp, SignOn, Data)", "de": "D0 (WakeUp, SignOn, Data)"},
    "value_protocol_JsonEfrProtocol":   {"en": "JSON-Format EFR SmartGridHub", "de": "JSON-Format EFR SmartGridHub"},
    "value_protocol_SmlProtocol":   {"en": "SmartMeterLanguage 1.0.3", "de": "SmartMeterLanguage 1.0.3"},
    "info_protocol":   {"en": " ", "de": " "},

    "field_transport":   {"en": "Data Transfer", "de": "Datenübertragung"},
    "value_transport_HttpRequestTransport":   {"en": "Read Data from an HTTP URL", "de": "Daten von einer HTTP-URL auslesen"},
    "value_transport_LocalFileTransport":   {"en": "Read Data from a local file", "de": "Daten aus einer lokalen Datei lesen"},
    "value_transport_SerialRequestResponseTransport":   {"en": "Serial Device with Bi-dir. comm.", "de": "Serielles Gerät mit bidir. Komm."},
    "value_transport_SerialResponseTransport":   {"en": "Serial Device reading data only", "de": "Serielles Gerät Daten werden nur gelesen"},
    "info_transport":   {"en": " ", "de": " "},

    "field_requestInterval":   {"en": "Data request interval", "de": "Daten Abfrageintervall"},
    "info_requestInterval":   {"en": "use 0 for continous reading/requesting,<br>Default if empty: 300", "de": "0 benutzen um ohne Unterbrechung zu lesen/anzufordern,<br>Standard wenn leer: 300"},

    "field_transportSerialPort":   {"en": "Serial Device Name", "de": "Serielles Gerät: Name"},
    "info_transportSerialPort":   {"en": " ", "de": " "},

    "field_transportSerialBaudrate":   {"en": "Serial Device Baudrate", "de": "Serielles Gerät: Baudrate"},
    "info_transportSerialBaudrate":   {"en": "If empty, protocol defaults are used<br>(D0: 300, SML: 9600)", "de": "Wenn leer werden Protokoll-Standards verwendet<br>(D0: 300, SML: 9600)"},

    "field_transportSerialDataBits":   {"en": "Serial Device DataBits", "de": "Serielles Gerät: Data-Bits"},
    "info_transportSerialDataBits":   {"en": "If empty, protocol defaults are used<br>(D0: 7, SML: 8)", "de": "Wenn leer werden Protokoll-Standards verwendet<br>(D0: 7, SML: 8)"},

    "field_transportSerialStopBits":   {"en": "Serial Device StopBits", "de": "Serielles Gerät: Stop-Bits"},
    "info_transportSerialStopBits":   {"en": "If empty, protocol defaults are used<br>(D0: 1, SML: 1)", "de": "Wenn leer werden Protokoll-Standards verwendet<br>(D0: 1, SML: 1)"},

    "field_transportSerialParity":   {"en": "Serial Device Parity", "de": "Serielles Gerät: Parität"},
    "info_transportSerialParity":   {"en": "If empty, protocol defaults are used<br>(D0: even, SML: none)", "de": "Wenn leer werden Protokoll-Standards verwendet<br>(D0: even, SML: none)"},

    "field_transportSerialMessageTimeout":   {"en": "Serial-Response Timeout", "de": "Serielle Antwort Wartezeit"},
    "info_transportSerialMessageTimeout":   {"en": "Defines how long to wait for a valid message before restarting. Consider the baudrate!<br>Default if empty: 120s", "de": "Wie lange soll auf eine korrekte Nachricht gewartet werden? Die Baudrate muss berücjsichtigt werden!<br>Standard wenn leer: 120s"},

    "field_transportHttpRequestUrl":   {"en": "HTTP-URL", "de": "HTTP-URL"},
    "info_transportHttpRequestUrl":   {"en": " ", "de": " "},

    "field_transportHttpRequestTimeout":   {"en": "HTTP-Request Timeout", "de": "HTTP-Anfrage Timeout"},
    "info_transportHttpRequestTimeout":   {"en": "Default if empty: 2000", "de": "Standard wenn leer: 2000"},

    "field_transportLocalFilePath":   {"en": "Absolute path to local datafile", "de": "Absoluter Pfad zur Daten-Datei"},
    "info_transportLocalFilePath":   {"en": " ", "de": " "},

    "field_protocolD0WakeupCharacters":   {"en": "D0: Number of WakeUp-Characters", "de": "D0: Anzahl WakeUp-Character"},
    "info_protocolD0WakeupCharacters":   {"en": "(NULL characters)<br>Default if empty: 0", "de": "(NULL Zeichen) <br>Standard wenn leer: 0"},

    "field_protocolD0DeviceAddress":   {"en": "D0: Device Address", "de": "D0: Geräteadresse"},
    "info_protocolD0DeviceAddress":   {"en": "(Empty by default)", "de": "(leer wenn nicht angegeben)"},

    "field_protocolD0SignOnMessage":   {"en": "D0: SignOn-Message Command", "de": "D0: Kommando SignOn-Nachricht"},
    "info_protocolD0SignOnMessage":   {"en": "(Default if empty: <b>?</b><br>to read mandatory values)", "de": "(Standard wenn leer: <b>?</b><br> um Pflichtwerte zu lesen)"},

    "field_protocolD0ModeOverwrite":   {"en": "D0: Mode Overwrite", "de": "D0: Überschreiben des Modus"},
    "info_protocolD0ModeOverwrite":   {"en": "(Empty if Mode from Device should be used, else A, B, C, D or E is allowed to overwrite", "de": "Leer wenn Mode vom Device genutzt werden soll, ansonsten Überschreiben: A, B, C, D, E"},

    "field_protocolD0BaudrateChangeoverOverwrite":   {"en": "D0: Baudrate Changeover Overwrite", "de": "D0: Überschreiben der Baudrate-Änderung"},
    "info_protocolD0BaudrateChangeoverOverwrite":   {"en": "Empty if Baudrate from Device is used", "de": "Leer wenn die Baudrate vom Device verwendet werden soll"},

    "field_anotherQueryDelay":   {"en": "Delay between multiple SignOn-Messages", "de": "Verzögerung zwischen zwei SignOn-Nachrichten"},
    "info_anotherQueryDelay":   {"en": "A delay is needed because Adapter will send a new mesaage and device needs to reset first,<br>Default if empty: 1000", "de": "EIne Verzögerung ist nötig, da sich das Gerät resetten muss,<br>Standardwert wenn leer ist 1000"},

    "field_protocolSmlIgnoreInvalidCRC":   {"en": "SML: Ignore CRC checksum error", "de": "SML: CRC-prüfsummenfehler ignorieren"},
    "info_protocolSmlIgnoreInvalidCRC":   {"en": " ", "de": " "},

    "field_obisFallbackMedium":   {"en": "D0: Fallback OBIS-Medium", "de": "D0: Ersatz OBIS-Medium"},
    "value_obisFallbackMedium_0":   {"en": "0: Abstract", "de": "0: Abstrakt"},
    "value_obisFallbackMedium_1":   {"en": "1: Electricity", "de": "1: Strom"},
    "value_obisFallbackMedium_4":   {"en": "4: Heat cost Allocator", "de": "4: Heizkostenverteiler"},
    "value_obisFallbackMedium_5":   {"en": "5: Cooling", "de": "5: Kälte"},
    "value_obisFallbackMedium_6":   {"en": "6: Heat", "de": "6: Wärme"},
    "value_obisFallbackMedium_7":   {"en": "7: Gas", "de": "7: Gas"},
    "value_obisFallbackMedium_8":   {"en": "8: Cold water", "de": "8: Kaltwasser"},
    "value_obisFallbackMedium_9":   {"en": "9: Hot water", "de": "9: Warmwasser"},
    "value_obisFallbackMedium_16":   {"en": "16: Oil", "de": "16: Öl"},
    "value_obisFallbackMedium_17":   {"en": "17: Compressed air", "de": "17: Druckluft"},
    "value_obisFallbackMedium_18":   {"en": "18: Nitrogen", "de": "18: Stickstoff"},
    "info_obisFallbackMedium":   {"en": "(used for name resolving when no OBIS medium is defined in data message)", "de": "(wird zur Namensauflösung benutzt falls kein OBIS-Medium in den Daten existiert)"},

    "field_obisNameLanguage":   {"en": "Language for Datapoint Names", "de": "Sprache der Datenpunktnamen"},
    "value_obisNameLanguage_de":   {"en": "German", "de": "Deutsch"},
    "value_obisNameLanguage_en":   {"en": "English", "de": "Englisch"},
    "info_obisNameLanguage":   {"en": " ", "de": " "},
    "Not available": {
        "en": "Port list not available",
        "de": "Portliste nicht verfügbar",
        "ru": "Список портов недоступен",
        "pt": "Lista de portas não disponível",
        "nl": "Poortlijst niet beschikbaar",
        "fr": "Liste de ports non disponible",
        "it": "Elenco delle porte non disponibile",
        "es": "Lista de puertos no disponible",
        "pl": "Lista portów niedostępna",
        "zh-cn": "端口列表不可用"
    },
    "Use custom Serial port path": {
        "en": "Use custom Serial port path",
        "de": "Verwenden Sie einen benutzerdefinierten Pfad für den seriellen Anschluss",
        "ru": "Использовать пользовательский путь последовательного порта",
        "pt": "Usar caminho de porta serial personalizado",
        "nl": "Gebruik een aangepast serieel poortpad",
        "fr": "Utiliser un chemin de port série personnalisé",
        "it": "Usa percorso porta seriale personalizzato",
        "es": "Usar ruta de puerto serie personalizada",
        "pl": "Użyj niestandardowej ścieżki portu szeregowego",
        "zh-cn": "使用自定义串行端口路径"
    },
    "field_customSerialPort": {
        "en": "Custom serial Port path",
        "de": "Benutzerdefinierter Pfad der seriellen Schnittstelle",
        "ru": "Пользовательский последовательный порт",
        "pt": "Caminho da porta serial personalizado",
        "nl": "Aangepast serieel poortpad",
        "fr": "Chemin du port série personnalisé",
        "it": "Percorso della porta seriale personalizzata",
        "es": "Ruta de puerto serie personalizada",
        "pl": "Niestandardowa ścieżka portu szeregowego",
        "zh-cn": "自定义串行端口路径"
    }
};

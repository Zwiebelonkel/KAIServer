
const modules = 

[
  {
    id: 'intro-to-ai',
    title: 'Was ist eigentlich KI?',
    description: 'Eine Einführung in die Welt der künstlichen Intelligenz ohne Fachchinesisch.',
    icon: 'Sparkles',
    minLevel: 'Einsteiger',
    content: 'Künstliche Intelligenz ist nicht ein einzelnes Programm, sondern ein Überbegriff für Technologien, die Maschinen befähigen, Aufgaben auszuführen, die normalerweise menschliche Intelligenz auffordern. Das reicht von der einfachen Sortierung von E-Mails bis hin zum autonomen Fahren.',
    glossary: [
      { term: 'Algorithmus', definition: 'Eine präzise Handlungsanweisung, um ein Problem zu lösen – wie ein Kochrezept für den Computer.' },
      { term: 'Turing-Test', definition: 'Ein Experiment, um festzustellen, ob eine Maschine ein dem Menschen gleichwertiges Denkvermögen besitzt.' },
      { term: 'Schwache KI', definition: 'KI, die auf eine spezifische Aufgabe spezialisiert ist (z.B. Schachcomputer).' }
    ],
    quiz: [
      {
        id: 'q1-intro',
        question: 'Was beschreibt KI am besten?',
        options: [
          'Ein Roboter, der die Weltherrschaft will',
          'Technologien, die menschliche Intelligenzaufgaben nachahmen',
          'Ein einfacher Taschenrechner',
          'Ein Videospiel'
        ],
        correctIndex: 1,
        explanation: 'KI ist ein Werkzeugset, um komplexe Probleme durch Mustererkennung und Logik zu lösen, ähnlich wie Menschen es tun.'
      },
      {
        id: 'q2-intro',
        question: 'Welche Art von KI begegnet uns heute am häufigsten?',
        options: [
          'Starke KI (Alleskönner)',
          'Schwache KI (Spezialisiert)',
          'Übermenschliche Intelligenz',
          'Bewusste Maschinen'
        ],
        correctIndex: 1,
        explanation: 'Fast alle heutigen KIs sind "Schwache KI", da sie nur für spezifische Aufgaben wie Bilderkennung oder Textgenerierung trainiert wurden.'
      },
      {
        id: 'q3-intro',
        question: 'Was ist ein Algorithmus?',
        options: [
          'Eine Art von Metall',
          'Ein Computergehäuse',
          'Eine präzise Handlungsanweisung zur Problemlösung',
          'Ein Internet-Virus'
        ],
        correctIndex: 2,
        explanation: 'Ein Algorithmus ist wie ein Kochrezept: Eine Abfolge von Schritten, die zum Ziel führt.'
      }
    ]
  },
  {
    id: 'ai-image-fake-news',
    title: 'KI-Bilder & Fake News erkennen',
    description: 'Wie du manipulierte Bilder, KI-generierte Inhalte und falsche Nachrichten besser einschätzen kannst.',
    icon: 'ShieldAlert',
    minLevel: 'Einsteiger',
    content: 'KI-generierte Bilder und Fake News können sehr überzeugend wirken. Deshalb ist es wichtig, Inhalte nicht sofort zu glauben, sondern bewusst zu prüfen. Achte auf unlogische Details im Bild, merkwürdige Hände, falsche Schatten, verzerrte Schrift oder unrealistische Szenen. Bei Nachrichten solltest du immer prüfen, wer die Quelle ist, ob andere seriöse Medien darüber berichten und ob das Bild wirklich zum Ereignis passt.',
    glossary: [
      { term: 'KI-generiertes Bild', definition: 'Ein Bild, das ganz oder teilweise von künstlicher Intelligenz erstellt wurde.' },
      { term: 'Fake News', definition: 'Falsche oder irreführende Informationen, die wie echte Nachrichten wirken sollen.' },
      { term: 'Quelle', definition: 'Der Ursprung einer Information, zum Beispiel eine Webseite, Zeitung oder Person.' },
      { term: 'Bildmanipulation', definition: 'Eine nachträgliche Veränderung eines Bildes, um etwas anders darzustellen als es wirklich war.' },
      { term: 'Reverse Image Search', definition: 'Eine Rückwärtssuche mit einem Bild, um herauszufinden, wo es bereits im Internet verwendet wurde.' }
    ],
    quiz: [
      {
        id: 'q1-image-fake',
        question: 'Handelt es sich bei diesem Porträt um ein echtes Foto oder eine KI-Generierung? Achte auf den Hintergrund und die Details an den Haaren.',
        imageUrl: 'https://picsum.photos/seed/kai6/600/400',
        options: ['Echtes Foto', 'KI-Generiert'],
        correctIndex: 1,
        explanation: 'KI-Bilder können besonders bei komplexen Details wie feinen Haarsträhnen oder dem Verschmelzen von Vorder- und Hintergrund Fehler machen.',
      },
      {
        id: 'q2-image-fake',
        question: 'Diese Landschaft wirkt perfekt. Aber ist sie auch real? Checke die Spiegelungen im Wasser.',
        imageUrl: 'https://picsum.photos/seed/kai7/600/400',
        options: ['Echt', 'KI-Fälschung'],
        correctIndex: 1,
        explanation: 'Physikalische Unkorrektheiten in Spiegelungen oder Schatten sind klassische Warnsignale für KI-Inhalte.',
      },
      {
        id: 'q3-image-fake',
        question: 'Was ist ein typisches Warnsignal bei KI-generierten Bildern?',
        options: [
          'Das Bild ist bunt',
          'Unlogische Details wie falsche Hände oder verzerrte Schrift',
          'Das Bild hat eine hohe Auflösung',
          'Das Bild wurde auf einem Handy angesehen'
        ],
        correctIndex: 1,
        explanation: 'KI-Modelle haben oft Schwierigkeiten mit anatomischen Details wie Fingern oder der logischen Struktur von Text innerhalb von Bildern.'
      },
      {
        id: 'q4-image-fake',
        question: 'Was solltest du tun, bevor du eine schockierende Nachricht weiterleitest?',
        options: [
          'Sofort teilen',
          'Nur die Überschrift lesen',
          'Quelle prüfen und schauen, ob andere seriöse Medien darüber berichten',
          'Dem Bild automatisch glauben'
        ],
        correctIndex: 2,
        explanation: 'Emotionale oder schockierende Inhalte werden oft zur Manipulation genutzt. Ein Quellencheck ist unerlässlich.'
      },
      {
        id: 'q5-image-fake',
        question: 'Was bedeutet Reverse Image Search?',
        options: [
          'Ein Bild abdunkeln',
          'Ein Bild rückwärts abspielen',
          'Mit einem Bild suchen, wo es bereits online vorkommt',
          'Ein Bild löschen'
        ],
        correctIndex: 2,
        explanation: 'Die Rückwärtssuche hilft zu erkennen, ob ein Bild in einem völlig falschen oder veralteten Kontext verwendet wird.'
      }
    ]
  },
  {
    id: 'regression',
    title: 'Regression & Vorhersage',
    description: 'Wie KI Trends erkennt und die Zukunft (ein bisschen) vorhersagt.',
    icon: 'TrendingUp',
    minLevel: 'Basics',
    content: 'Regression wird genutzt, um Werte vorherzusagen. Zum Beispiel: Wie viel wird ein Haus kosten, basierend auf seiner Größe? Die KI zieht eine Linie durch vorhandene Datenpunkte, um den Trend zu erfassen.',
    glossary: [
      { term: 'Lineare Regression', definition: 'Die einfachste Form der Vorhersage, bei der eine gerade Linie durch Datenpunkte gelegt wird.' },
      { term: 'Features', definition: 'Die Merkmale eines Objekts (z.B. Quadratmeter), die zur Berechnung genutzt werden.' },
      { term: 'Overfitting', definition: 'Wenn ein Modell die Trainingsdaten zu genau auswendig lernt und bei neuen Daten versagt.' }
    ],
    quiz: [
      {
        id: 'q1-reg',
        question: 'Was ist das Ziel der Regression?',
        options: [
          'Bilder in Kategorien einteilen',
          'Kontinuierliche Werte vorhersagen',
          'Dateien löschen',
          'Passwörter knacken'
        ],
        correctIndex: 1,
        explanation: 'Regression wird verwendet, um numerische Werte wie Preise oder Temperaturen basierend auf historischen Daten vorherzusagen.'
      },
      {
        id: 'q2-reg',
        question: 'Was sind "Features" in einem Datensatz?',
        options: [
          'Die Ergebnisse',
          'Spezialeffekte im Video',
          'Die Merkmale oder Eigenschaften der Datenpunkte',
          'Fehler im Code'
        ],
        correctIndex: 2,
        explanation: 'Features sind die Eingabevariablen (z.B. PS-Zahl bei Autos), die zur Vorhersage genutzt werden.'
      },
      {
        id: 'q3-reg',
        question: 'Was passiert beim Overfitting?',
        options: [
          'Die KI lernt zu langsam',
          'Die KI lernt die Daten zu starr auswendig und wird unflexibel',
          'Der Computer wird zu heiß',
          'Die Daten werden gelöscht'
        ],
        correctIndex: 1,
        explanation: 'Beim Overfitting "merkt" sich die KI Rauschen statt Trends, was die Vorhersage für neue Daten verschlechtert.'
      }
    ]
  },
  {
    id: 'classification',
    title: 'Klassifikation',
    description: 'Ist das eine Katze oder ein Muffin? Wie KI lernt, Dinge zu unterscheiden.',
    icon: 'Grid',
    minLevel: 'Basics',
    content: 'Bei der Klassifikation geht es darum, Daten in vordefinierte Kategorien einzuteilen. Ein Spam-Filter ist das klassische Beispiel: Ist diese Mail "Spam" oder "Wichtig"?',
    glossary: [
      { term: 'Binäre Klassifikation', definition: 'Eine Entscheidung zwischen genau zwei Möglichkeiten (Ja/Nein).' },
      { term: 'Label', definition: 'Die Antwortkategorie, die wir einem Datenpunkt zuweisen.' },
      { term: 'Multiklassen-Klassifikation', definition: 'Einteilung in mehr als zwei Kategorien (z.B. Hunderassen).' }
    ],
    quiz: [
      {
        id: 'q1-class',
        question: 'Welches dieser Beispiele ist eine Klassifikation?',
        options: [
          'Vorhersage der Regenmenge in mm',
          'Erkennung, ob ein Röntgenbild einen Bruch zeigt',
          'Berechnung des Benzinverbrauchs',
          'Sortierung von Zahlen nach Größe'
        ],
        correctIndex: 1,
        explanation: 'Die Entscheidung "Bruch" oder "Kein Bruch" ist eine Einteilung in Kategorien – also Klassifikation.'
      },
      {
        id: 'q2-class',
        question: 'Was ist ein "Label"?',
        options: [
          'Der Name des Programmierers',
          'Die zugewiesene Kategorie eines Datenpunkts',
          'Ein Aufkleber auf dem Server',
          'Ein Befehl zum Stoppen'
        ],
        correctIndex: 1,
        explanation: 'Labels sind die Zielkategorien (z.B. "Spam"), die die KI lernen soll zu vergeben.'
      },
      {
        id: 'q3-class',
        question: 'Was ist der Unterschied zwischen Regression und Klassifikation?',
        options: [
          'Es gibt keinen',
          'Regression sagt Zahlen vorher, Klassifikation Kategorien',
          'Regression ist schneller',
          'Klassifikation ist nur für Bilder'
        ],
        correctIndex: 1,
        explanation: 'Regression liefert Zahlen (z.B. 25,5 Grad), Klassifikation liefert Gruppen (z.B. "Warm" oder "Kalt").'
      }
    ]
  },
  {
    id: 'neural-networks',
    title: 'Neuronale Netze',
    description: 'Tiefes Lernen: Wie das menschliche Gehirn als Vorbild dient.',
    icon: 'Cpu',
    minLevel: 'Fortgeschritten',
    content: 'Neuronale Netze bestehen aus Schichten von "Neuronen", die Signale verarbeiten. Durch "Deep Learning" können diese Netze extrem komplexe Muster in Bildern, Sprache oder Musik erkennen.',
    glossary: [
      { term: 'Hidden Layer', definition: 'Die "unsichtbaren" Schichten im Netz, in denen die eigentliche Magie der Mustererkennung passiert.' },
      { term: 'Backpropagation', definition: 'Das Verfahren, mit dem das Netz aus seinen Fehlern lernt und seine Gewichte anpasst.' },
      { term: 'Weights (Gewichte)', definition: 'Zahlenwerte, die bestimmen, wie stark ein Signal zwischen Neuronen weitergegeben wird.' }
    ],
    quiz: [
      {
        id: 'q1-neural',
        question: 'Was ist "Deep Learning"?',
        options: [
          'KI, die unter Wasser funktioniert',
          'Das Training von neuronalen Netzen mit vielen Schichten',
          'Auswendiglernen von Wikipedia',
          'Besonders schnelles Tippen'
        ],
        correctIndex: 1,
        explanation: 'Das "Deep" bezieht sich auf die Tiefe (Anzahl der Schichten) des neuronalen Netzes.'
      },
      {
        id: 'q2-neural',
        question: 'Was passiert bei der Backpropagation?',
        options: [
          'Der PC wird neu gestartet',
          'Daten werden gelöscht',
          'Fehler werden zurückgerechnet, um das Netz zu korrigieren',
          'Das Internet wird langsamer'
        ],
        correctIndex: 2,
        explanation: 'Backpropagation erlaubt es dem Netz, "Fehler" vom Ausgang zurück zum Eingang zu verfolgen und Einstellungen anzupassen.'
      },
      {
        id: 'q3-neural',
        question: 'Wozu dienen "Weights" (Gewichte) in einem Neuron?',
        options: [
          'Sie messen die Hardware-Schwere',
          'Sie bestimmen den Einfluss eines Eingangssignals',
          'Sie zählen die Nutzer',
          'Sie speichern das Passwort'
        ],
        correctIndex: 1,
        explanation: 'Gewichte sind die Stellschrauben der KI. Sie entscheiden, welche Informationen wichtig sind.'
      }
    ]
  }
];
module.exports = { modules };

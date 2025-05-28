import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Volume2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { InsertFoodItem } from "@shared/schema";

interface BrowserVoiceInputProps {
  onVoiceData: (data: Partial<InsertFoodItem>) => void;
  onTranscript: (transcript: string) => void;
  onAutoSubmit?: (data?: Partial<InsertFoodItem>) => void;
  onQuery?: (queryType: string, result: string) => void;
}

export default function BrowserVoiceInput({ onVoiceData, onTranscript, onAutoSubmit, onQuery }: BrowserVoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const recognitionRef = useRef<any>(null);
  const { toast } = useToast();

  const startListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast({
        title: "Browser non supportato",
        description: "Il riconoscimento vocale non è supportato in questo browser",
        variant: "destructive"
      });
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.lang = 'it-IT';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      toast({
        title: "🎤 Ascolto attivo",
        description: "Parla chiaramente per aggiungere l'alimento"
      });
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      console.log("Browser speech recognition result:", transcript);
      
      setIsProcessing(true);
      onTranscript(transcript);
      
      // Process voice input asynchronously
      handleFoodQuery(transcript).then(queryResult => {
        if (queryResult) {
          // This is a question about existing food items
          toast({
            title: "🔍 Ricerca completata",
            description: queryResult.summary
          });
          
          if (onQuery) {
            onQuery(queryResult.type, queryResult.message);
          }
        } else {
          // Try to parse as new food item data
          const parsedData = parseLocalVoiceInput(transcript);
          
          if (parsedData && parsedData.name) {
            onVoiceData(parsedData);
            
            toast({
              title: "✅ Riconosciuto",
              description: `"${transcript}"`
            });

            // Auto-submit if we have minimum required data
            if (parsedData.name && parsedData.daysToExpiry && onAutoSubmit) {
              console.log("Auto-submitting with data:", parsedData);
              setTimeout(() => {
                onAutoSubmit(parsedData);
              }, 500);
            } else if (parsedData.name && onAutoSubmit) {
              // Anche se non abbiamo scadenza, invia i dati parziali e chiudi
              console.log("Sending partial data:", parsedData);
              setTimeout(() => {
                onAutoSubmit(parsedData);
              }, 1000);
            }
          } else {
            toast({
              title: "⚠️ Non riconosciuto",
              description: `"${transcript}" - Prova a dire qualcosa come "latte che scade tra 5 giorni" o "cosa scade oggi?"`
            });
          }
        }
        setIsProcessing(false);
      }).catch(error => {
        console.error("Error processing voice input:", error);
        toast({
          title: "Errore elaborazione",
          description: "Riprova a parlare",
          variant: "destructive"
        });
        setIsProcessing(false);
      });
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      toast({
        title: "Errore riconoscimento",
        description: "Riprova a parlare più chiaramente",
        variant: "destructive"
      });
      setIsListening(false);
      setIsProcessing(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const handleClick = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <div className="flex flex-col items-center space-y-2">
      <Button
        type="button"
        onClick={handleClick}
        disabled={isProcessing}
        data-voice-start={!isListening && !isProcessing}
        className={`rounded-full w-16 h-16 ${
          isListening 
            ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
            : 'bg-green-500 hover:bg-green-600 text-white'
        }`}
        size="lg"
      >
        {isProcessing ? (
          <Volume2 className="h-8 w-8 animate-spin" />
        ) : isListening ? (
          <MicOff className="h-8 w-8" />
        ) : (
          <Mic className="h-8 w-8" />
        )}
      </Button>
      
      <p className="text-sm text-muted-foreground text-center">
        {isProcessing 
          ? "Elaborando..." 
          : isListening 
            ? "Tocca per fermare" 
            : "Tocca per parlare"
        }
      </p>
      
      {isListening && (
        <p className="text-xs text-green-600 text-center animate-pulse">
          🔴 In ascolto...
        </p>
      )}
    </div>
  );
}

// Enhanced local parsing function
function parseLocalVoiceInput(transcript: string): Partial<InsertFoodItem> {
  const text = transcript.toLowerCase();
  const result: Partial<InsertFoodItem> = {};

  // Extract days with more patterns, including written numbers and months
  const numberWords: Record<string, number> = {
    'uno': 1, 'una': 1, 'due': 2, 'tre': 3, 'quattro': 4, 'cinque': 5,
    'sei': 6, 'sette': 7, 'otto': 8, 'nove': 9, 'dieci': 10,
    'quindici': 15, 'venti': 20, 'trenta': 30
  };
  
  let daysValue = 0;
  
  // Try months first (convert to days)
  const monthsMatch = text.match(/(\d+)\s*(mesi?|mese)/i);
  if (monthsMatch) {
    daysValue = parseInt(monthsMatch[1]) * 30; // Convert months to days
  } else {
    // Try written months
    for (const [word, num] of Object.entries(numberWords)) {
      const writtenMonthMatch = text.match(new RegExp(`(${word})\\s*(mesi?|mese)`, 'i'));
      if (writtenMonthMatch) {
        daysValue = num * 30; // Convert to days
        break;
      }
    }
  }
  
  // If no months found, try days patterns
  if (daysValue === 0) {
    const daysMatch = text.match(/(\d+)\s*(giorni?|giorno|gg)/i) || 
                     text.match(/scadenza\s+(\d+)/i) ||
                     text.match(/tra\s+(\d+)/i) ||
                     text.match(/fra\s+(\d+)/i);
    
    if (daysMatch) {
      daysValue = parseInt(daysMatch[1]);
    } else {
      // Try written number patterns for days
      for (const [word, num] of Object.entries(numberWords)) {
        const writtenMatch = text.match(new RegExp(`(${word})\\s*(giorni?|giorno|gg)`, 'i')) ||
                            text.match(new RegExp(`scadenza\\s+(${word})`, 'i')) ||
                            text.match(new RegExp(`tra\\s+(${word})`, 'i')) ||
                            text.match(new RegExp(`fra\\s+(${word})`, 'i'));
        if (writtenMatch) {
          daysValue = num;
          break;
        }
      }
    }
  }
  
  if (daysValue > 0) {
    result.daysToExpiry = daysValue;
  }

  // Expanded food keywords with more variety
  const foodKeywords = [
    'latte', 'pane', 'mele', 'pomodori', 'carne', 'pesce', 'formaggio', 'yogurt', 'pasta', 'riso',
    'insalata', 'lattuga', 'verdure', 'carote', 'patate', 'cipolle', 'aglio',
    'prosciutto', 'salame', 'mortadella', 'bresaola',
    'banana', 'arance', 'limoni', 'kiwi', 'fragole', 'uva',
    'pollo', 'manzo', 'maiale', 'vitello',
    'salmone', 'tonno', 'orata', 'branzino',
    'mozzarella', 'parmigiano', 'gorgonzola', 'ricotta',
    'biscotti', 'crackers', 'grissini',
    'olio', 'aceto', 'sale', 'zucchero', 'farina',
    'uova', 'burro', 'margarina'
  ];

  // Find the longest matching food name
  let longestMatch = '';
  for (const food of foodKeywords) {
    if (text.includes(food) && food.length > longestMatch.length) {
      longestMatch = food;
    }
  }
  
  if (longestMatch) {
    result.name = longestMatch;
  } else {
    // Try to extract first meaningful word as food name
    const words = text.split(' ');
    const meaningfulWords = words.filter(word => 
      word.length > 2 && 
      !['che', 'tra', 'per', 'con', 'nel', 'dal', 'del', 'della', 'delle', 'dei', 'degli', 'scade', 'scadenza', 'giorni', 'giorno', 'aggiungi', 'inserisci'].includes(word)
    );
    if (meaningfulWords.length > 0) {
      result.name = meaningfulWords[0];
    }
  }

  // Enhanced category mapping
  if (result.name) {
    const categories: Record<string, string> = {
      // Latticini
      'latte': 'Latticini', 'formaggio': 'Latticini', 'yogurt': 'Latticini', 
      'mozzarella': 'Latticini', 'parmigiano': 'Latticini', 'gorgonzola': 'Latticini', 
      'ricotta': 'Latticini', 'burro': 'Latticini', 'margarina': 'Latticini',
      
      // Carne
      'carne': 'Carne', 'pollo': 'Carne', 'manzo': 'Carne', 'maiale': 'Carne', 
      'vitello': 'Carne', 'prosciutto': 'Carne', 'salame': 'Carne', 
      'mortadella': 'Carne', 'bresaola': 'Carne',
      
      // Pesce
      'pesce': 'Pesce', 'salmone': 'Pesce', 'tonno': 'Pesce', 
      'orata': 'Pesce', 'branzino': 'Pesce',
      
      // Frutta
      'mele': 'Frutta', 'banana': 'Frutta', 'arance': 'Frutta', 
      'limoni': 'Frutta', 'kiwi': 'Frutta', 'fragole': 'Frutta', 'uva': 'Frutta',
      
      // Verdure
      'pomodori': 'Verdure', 'insalata': 'Verdure', 'lattuga': 'Verdure', 
      'verdure': 'Verdure', 'carote': 'Verdure', 'patate': 'Verdure', 
      'cipolle': 'Verdure', 'aglio': 'Verdure',
      
      // Cereali
      'pane': 'Cereali', 'pasta': 'Cereali', 'riso': 'Cereali', 
      'biscotti': 'Cereali', 'crackers': 'Cereali', 'grissini': 'Cereali', 'farina': 'Cereali',
      
      // Altro
      'uova': 'Altro', 'olio': 'Altro', 'aceto': 'Altro', 
      'sale': 'Altro', 'zucchero': 'Altro'
    };
    
    result.category = categories[result.name] || 'Altro';
  }

  // Enhanced location detection
  if (text.includes('frigorifero') || text.includes('frigo')) {
    result.location = 'Frigorifero';
  } else if (text.includes('freezer') || text.includes('congelatore')) {
    result.location = 'Freezer';
  } else if (text.includes('dispensa') || text.includes('credenza')) {
    result.location = 'Dispensa';
  } else if (text.includes('cassetto')) {
    result.location = 'Frigorifero'; // Assume cassetto = cassetto frigo
  }

  console.log("Parsing result:", { transcript, result });
  return result;
}

// Function to handle food queries
async function handleFoodQuery(transcript: string): Promise<{ type: string; message: string; summary: string } | null> {
  const text = transcript.toLowerCase();
  
  // Check if this is a query about food status
  const queryPatterns = [
    /cosa.*scade.*oggi/i,
    /quali.*scade.*oggi/i,
    /quali.*alimenti.*scade/i,
    /quali.*alimenti.*scadono/i,
    /cosa.*scadenza.*oggi/i,
    /alimenti.*scade.*oggi/i,
    /cosa.*sta.*scadendo/i,
    /quali.*stanno.*scadendo/i,
    /cosa.*scade.*domani/i,
    /cosa.*scade.*fra/i,
    /quali.*scade.*fra/i,
    /quali.*scadono.*fra/i,
    /alimenti.*scadenza/i,
    /lista.*scadenza/i,
    /controlla.*scadenza/i,
    /dimmi.*cosa.*scade/i,
    /dimmi.*quali.*scade/i
  ];
  
  const isQuery = queryPatterns.some(pattern => pattern.test(text));
  
  console.log("Query check:", { 
    text, 
    isQuery, 
    matchedPatterns: queryPatterns.filter(pattern => pattern.test(text)) 
  });
  
  if (!isQuery) {
    return null;
  }
  
  try {
    // Fetch current food items from the API
    const response = await fetch('/api/food-items');
    if (!response.ok) {
      throw new Error('Errore nel recupero dei dati');
    }
    
    const foodItems = await response.json();
    
    // Calculate which items are expiring today or soon
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const expiringToday = [];
    const expiringTomorrow = [];
    const expiringSoon = [];
    
    for (const item of foodItems) {
      const prepDate = new Date(item.preparationDate);
      const expiryDate = new Date(prepDate);
      expiryDate.setDate(prepDate.getDate() + item.daysToExpiry);
      
      const diffTime = expiryDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays <= 0) {
        expiringToday.push(item);
      } else if (diffDays === 1) {
        expiringTomorrow.push(item);
      } else if (diffDays <= 3) {
        expiringSoon.push(item);
      }
    }
    
    // Build response message
    let message = '';
    let summary = '';
    
    if (text.includes('oggi')) {
      if (expiringToday.length === 0) {
        message = '✅ Nessun alimento scade oggi!';
        summary = 'Nessuna scadenza oggi';
      } else {
        const foodNames = expiringToday.map(item => item.name).join(', ');
        message = `⚠️ Oggi scade: ${foodNames}`;
        summary = `${expiringToday.length} alimento/i in scadenza oggi`;
      }
    } else if (text.includes('domani')) {
      if (expiringTomorrow.length === 0) {
        message = '✅ Nessun alimento scade domani!';
        summary = 'Nessuna scadenza domani';
      } else {
        const foodNames = expiringTomorrow.map(item => item.name).join(', ');
        message = `⚠️ Domani scade: ${foodNames}`;
        summary = `${expiringTomorrow.length} alimento/i scade domani`;
      }
    } else {
      // General expiry check
      const totalExpiring = expiringToday.length + expiringTomorrow.length + expiringSoon.length;
      
      if (totalExpiring === 0) {
        message = '✅ Tutti gli alimenti sono freschi!';
        summary = 'Nessuna scadenza imminente';
      } else {
        let parts = [];
        
        if (expiringToday.length > 0) {
          parts.push(`⚠️ Oggi: ${expiringToday.map(item => item.name).join(', ')}`);
        }
        
        if (expiringTomorrow.length > 0) {
          parts.push(`📅 Domani: ${expiringTomorrow.map(item => item.name).join(', ')}`);
        }
        
        if (expiringSoon.length > 0) {
          parts.push(`⏰ Prossimi giorni: ${expiringSoon.map(item => item.name).join(', ')}`);
        }
        
        message = parts.join('\n\n');
        summary = `${totalExpiring} alimento/i in scadenza`;
      }
    }
    
    return {
      type: 'expiry_check',
      message,
      summary
    };
    
  } catch (error) {
    return {
      type: 'error',
      message: 'Errore nel controllare le scadenze. Riprova più tardi.',
      summary: 'Errore di connessione'
    };
  }
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}
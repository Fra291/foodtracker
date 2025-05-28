import { useState } from "react";
import { Settings, User, Bell, Shield, Info, ChevronRight, Moon, Sun, LogOut } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import BottomNavigation from "@/components/BottomNavigation";
import { useAuth } from "@/hooks/useAuth";
import { logout } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [autoDelete, setAutoDelete] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: "Disconnesso",
        description: "Sei stato disconnesso con successo",
      });
      // Reindirizza alla pagina di login dopo il logout
      setLocation("/");
    } catch (error) {
      toast({
        title: "Errore",
        description: "Errore durante la disconnessione",
        variant: "destructive",
      });
    }
  };

  const settingsGroups = [
    {
      title: "Account",
      items: [
        {
          icon: User,
          label: "Profilo Utente",
          description: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Utente' : "Caricamento...",
          action: "chevron"
        },
        {
          icon: LogOut,
          label: "Disconnetti",
          description: "Esci dal tuo account",
          action: "button",
          onClick: handleLogout
        }
      ]
    },
    {
      title: "Notifiche",
      items: [
        {
          icon: Bell,
          label: "Notifiche Scadenza",
          description: "Ricevi avvisi per alimenti in scadenza",
          action: "switch",
          value: notifications,
          onChange: setNotifications
        }
      ]
    },
    {
      title: "Preferenze",
      items: [
        {
          icon: darkMode ? Moon : Sun,
          label: "Tema Scuro",
          description: "Attiva il tema scuro dell'app",
          action: "switch",
          value: darkMode,
          onChange: setDarkMode
        },
        {
          icon: Shield,
          label: "Eliminazione Automatica",
          description: "Elimina automaticamente alimenti scaduti da 7 giorni",
          action: "switch",
          value: autoDelete,
          onChange: setAutoDelete
        }
      ]
    },
    {
      title: "Informazioni",
      items: [
        {
          icon: Info,
          label: "Informazioni App",
          description: "Versione 1.0.0",
          action: "chevron"
        }
      ]
    }
  ];

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header safe-area-top">
        <div className="px-4 py-3">
          <div className="flex items-center space-x-3">
            <div className="bg-primary p-2 rounded-xl">
              <Settings className="text-primary-foreground h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Impostazioni</h1>
              <p className="text-xs text-muted-foreground">Personalizza la tua esperienza</p>
            </div>
          </div>
        </div>
      </header>

      <main className="app-content safe-area-bottom">
        <div className="px-4 py-4 space-y-6">
          {settingsGroups.map((group, groupIndex) => (
            <div key={groupIndex} className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                {group.title}
              </h2>
              
              <Card className="mobile-card">
                <CardContent className="p-0">
                  {group.items.map((item, itemIndex) => {
                    const Icon = item.icon;
                    const isLast = itemIndex === group.items.length - 1;
                    
                    return (
                      <div
                        key={itemIndex}
                        className={`flex items-center justify-between p-4 ${
                          !isLast ? 'border-b border-border' : ''
                        }`}
                      >
                        <div className="flex items-center space-x-3 flex-1">
                          <div className="p-2 bg-muted rounded-lg">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-foreground">{item.label}</p>
                            <p className="text-xs text-muted-foreground">{item.description}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center">
                          {item.action === "switch" && "value" in item && "onChange" in item && (
                            <Switch
                              checked={item.value}
                              onCheckedChange={item.onChange}
                            />
                          )}
                          
                          {item.action === "chevron" && (
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          )}

                          {item.action === "button" && "onClick" in item && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={item.onClick}
                              className="text-red-600 border-red-200 hover:bg-red-50"
                            >
                              Disconnetti
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          ))}

          {/* App Info */}
          <div className="text-center space-y-2 py-8">
            <div className="bg-primary p-3 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
              <Settings className="text-primary-foreground h-8 w-8" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">FoodTracker</h3>
            <p className="text-sm text-muted-foreground">
              La tua dispensa smart per evitare sprechi alimentari
            </p>
            <p className="text-xs text-muted-foreground">
              Versione 1.0.0 • Made with ❤️
            </p>
          </div>

          <div className="pb-20"></div>
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
}
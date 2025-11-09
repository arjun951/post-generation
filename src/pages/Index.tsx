import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Car, Upload } from "lucide-react";

const BACKGROUND_THEMES = [
  { value: "showroom", label: "In Showroom" },
  { value: "road", label: "On Road" },
  { value: "mud", label: "In Mud" },
  { value: "sunset", label: "Sunset Background" },
  { value: "rain", label: "Rainy Background" },
  { value: "desert", label: "Desert" },
  { value: "mountain", label: "Mountain" },
  { value: "ship", label: "On a Ship" },
];

const Index = () => {
  const [dealership, setDealership] = useState("Arjun Motors");
  const [dealershipAddress, setDealershipAddress] = useState("");
  const [dealershipPhone, setDealershipPhone] = useState("");
  const [numberOfVehicles, setNumberOfVehicles] = useState(1);
  const [vehicleNames, setVehicleNames] = useState<string[]>([""]);
  const [vehicleImages, setVehicleImages] = useState<string[]>([]);
  const [dealershipTemplate, setDealershipTemplate] = useState("");
  const [specialFeature, setSpecialFeature] = useState("");
  const [backgroundTheme, setBackgroundTheme] = useState("");
  const [customKeywords, setCustomKeywords] = useState("");
  const [generatedImage, setGeneratedImage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleNumberOfVehiclesChange = (value: string) => {
    const num = parseInt(value);
    setNumberOfVehicles(num);
    setVehicleNames(Array(num).fill(""));
    setVehicleImages(Array(num).fill(""));
  };

  const handleFileUpload = async (file: File, type: 'template' | 'vehicle', index?: number) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      if (type === 'template') {
        setDealershipTemplate(base64String);
      } else if (type === 'vehicle' && index !== undefined) {
        const newVehicleImages = [...vehicleImages];
        newVehicleImages[index] = base64String;
        setVehicleImages(newVehicleImages);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleVehicleNameChange = (index: number, value: string) => {
    const newVehicleNames = [...vehicleNames];
    newVehicleNames[index] = value;
    setVehicleNames(newVehicleNames);
  };

  const handleGenerate = async () => {
    // Validation
    if (!backgroundTheme) {
      toast.error("Please select a background theme");
      return;
    }
    
    const filledVehicleNames = vehicleNames.filter(name => name.trim() !== "");
    if (filledVehicleNames.length === 0) {
      toast.error("Please enter at least one vehicle name");
      return;
    }

    setIsGenerating(true);
    setGeneratedImage("");

    try {
      const { data, error } = await supabase.functions.invoke('generate-post', {
        body: {
          dealershipName: dealership,
          dealershipAddress,
          dealershipPhone,
          numberOfVehicles,
          vehicleNames: filledVehicleNames,
          vehicleImages: vehicleImages.filter(img => img !== ""),
          dealershipTemplate,
          specialFeature,
          backgroundTheme,
          customKeywords,
        }
      });

      if (error) {
        console.error("Function error:", error);
        throw error;
      }

      if (data?.imageUrl) {
        setGeneratedImage(data.imageUrl);
        toast.success("Post generated successfully!");
      } else {
        throw new Error("No image URL in response");
      }
    } catch (error) {
      console.error("Error generating post:", error);
      toast.error("Failed to generate post. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Car className="w-12 h-12 text-primary" />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Dealership Post Generator
            </h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Create stunning social media posts for your automotive dealership with AI
          </p>
        </header>

        <div className="grid lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
          {/* Configuration Panel */}
          <Card className="shadow-lg border-2">
            <CardHeader>
              <CardTitle className="text-2xl">Configure Your Post</CardTitle>
              <CardDescription>Fill in the details to generate your promotional post</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Dealership Info */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Dealership Information</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="dealership">Dealership Name</Label>
                  <Input
                    id="dealership"
                    value={dealership}
                    onChange={(e) => setDealership(e.target.value)}
                    placeholder="Arjun Motors"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={dealershipAddress}
                    onChange={(e) => setDealershipAddress(e.target.value)}
                    placeholder="Enter dealership address"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={dealershipPhone}
                    onChange={(e) => setDealershipPhone(e.target.value)}
                    placeholder="Enter contact number"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="template">Dealership Template (Optional)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="template"
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file, 'template');
                      }}
                      className="cursor-pointer"
                    />
                    {dealershipTemplate && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDealershipTemplate("")}
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">Upload your branded template with logo and contact info</p>
                </div>
              </div>

              {/* Vehicle Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Vehicle Details</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="numVehicles">Number of Vehicles</Label>
                  <Select
                    value={numberOfVehicles.toString()}
                    onValueChange={handleNumberOfVehiclesChange}
                  >
                    <SelectTrigger id="numVehicles">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map((num) => (
                        <SelectItem key={num} value={num.toString()}>
                          {num} {num === 1 ? "Vehicle" : "Vehicles"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {vehicleNames.map((name, index) => (
                  <div key={index} className="space-y-3 p-4 border border-border rounded-lg">
                    <div className="space-y-2">
                      <Label htmlFor={`vehicle-${index}`}>Vehicle {index + 1} Name</Label>
                      <Input
                        id={`vehicle-${index}`}
                        value={name}
                        onChange={(e) => handleVehicleNameChange(index, e.target.value)}
                        placeholder="e.g., Honda City, Royal Enfield Classic"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`vehicle-image-${index}`}>Vehicle {index + 1} Photo (Optional)</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id={`vehicle-image-${index}`}
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(file, 'vehicle', index);
                          }}
                          className="cursor-pointer"
                        />
                        {vehicleImages[index] && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const newImages = [...vehicleImages];
                              newImages[index] = "";
                              setVehicleImages(newImages);
                            }}
                          >
                            Clear
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Special Features */}
              <div className="space-y-2">
                <Label htmlFor="special">Special Offer/Feature</Label>
                <Input
                  id="special"
                  value={specialFeature}
                  onChange={(e) => setSpecialFeature(e.target.value)}
                  placeholder="e.g., ₹50,000 OFF, Free Insurance"
                />
              </div>

              {/* Background Theme */}
              <div className="space-y-2">
                <Label htmlFor="theme">Background Theme</Label>
                <Select value={backgroundTheme} onValueChange={setBackgroundTheme}>
                  <SelectTrigger id="theme">
                    <SelectValue placeholder="Select background theme" />
                  </SelectTrigger>
                  <SelectContent>
                    {BACKGROUND_THEMES.map((theme) => (
                      <SelectItem key={theme.value} value={theme.value}>
                        {theme.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Custom Keywords */}
              <div className="space-y-2">
                <Label htmlFor="keywords">Custom Keywords (Optional)</Label>
                <Textarea
                  id="keywords"
                  value={customKeywords}
                  onChange={(e) => setCustomKeywords(e.target.value)}
                  placeholder="Add any specific details or keywords to include in the image..."
                  rows={3}
                />
              </div>

              <Button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full h-12 text-lg font-semibold"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Generating Your Post...
                  </>
                ) : (
                  <>
                    <Car className="mr-2 h-5 w-5" />
                    Generate Post
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Preview Panel */}
          <Card className="shadow-lg border-2">
            <CardHeader>
              <CardTitle className="text-2xl">Generated Post</CardTitle>
              <CardDescription>Your AI-generated promotional image will appear here</CardDescription>
            </CardHeader>
            <CardContent>
              {isGenerating ? (
                <div className="flex flex-col items-center justify-center h-96 space-y-4">
                  <Loader2 className="h-16 w-16 animate-spin text-primary" />
                  <p className="text-muted-foreground text-lg">Creating your amazing post...</p>
                </div>
              ) : generatedImage ? (
                <div className="space-y-4">
                  <div className="rounded-lg overflow-hidden border-2 border-primary shadow-xl">
                    <img
                      src={generatedImage}
                      alt="Generated dealership post"
                      className="w-full h-auto"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = generatedImage;
                        link.download = `${dealership}-post.png`;
                        link.click();
                        toast.success("Image downloaded!");
                      }}
                    >
                      Download Image
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setGeneratedImage("");
                        toast.info("Ready for a new post!");
                      }}
                    >
                      Generate New
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-96 space-y-4 text-center">
                  <Car className="h-24 w-24 text-muted-foreground/30" />
                  <div>
                    <p className="text-muted-foreground text-lg mb-2">
                      No post generated yet
                    </p>
                    <p className="text-muted-foreground text-sm">
                      Fill in the details and click "Generate Post" to create your promotional image
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;

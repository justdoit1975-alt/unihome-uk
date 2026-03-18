'use client';

import { useState, useEffect } from 'react';
import { Search, MapPin, PoundSterling, Bed, Bath, CheckCircle, XCircle, MessageSquare, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

// API base URL - configure this for your environment
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

type Listing = {
  id?: number;
  title: string;
  location: string;
  price: number;
  priceUnit: string;
  beds: number;
  baths: number;
  image_url: string;
  description?: string;
  ai_summary?: string;
  includes_bills?: boolean;
  student_friendly?: boolean;
  source_url: string;
  source: string;
};

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [selectedBeds, setSelectedBeds] = useState<number[]>([]);
  const [filterIncludesBills, setFilterIncludesBills] = useState(false);
  const [filterStudentOnly, setFilterStudentOnly] = useState(false);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load existing listings on mount
  useEffect(() => {
    loadListings();
  }, []);

  const loadListings = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/listings`);
      const data = await res.json();
      if (data.data) {
        setListings(data.data);
      }
    } catch (err) {
      console.error('Failed to load listings:', err);
    }
  };

  const handleSearch = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Search Rightmove first (you can switch to zoopla)
      const res = await fetch(`${API_BASE_URL}/api/crawl`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'rightmove',
          query: searchQuery,
          minPrice: minPrice ? parseInt(minPrice) : undefined,
          maxPrice: maxPrice ? parseInt(maxPrice) : undefined,
          beds: selectedBeds.length > 0 ? selectedBeds[0] : undefined,
        }),
      });
      
      const data = await res.json();
      if (data.error) {
        setError(data.message);
      } else {
        // Refresh listings after crawl
        await loadListings();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleBed = (bed: number) => {
    if (selectedBeds.includes(bed)) {
      setSelectedBeds(selectedBeds.filter(b => b !== bed));
    } else {
      setSelectedBeds([bed]); // Only allow one selection for simplicity
    }
  };

  // Apply filters to listings
  const filteredListings = listings.filter(listing => {
    if (minPrice && listing.price < parseInt(minPrice)) return false;
    if (maxPrice && listing.price > parseInt(maxPrice)) return false;
    if (selectedBeds.length > 0 && !selectedBeds.includes(listing.beds)) return false;
    if (filterIncludesBills && !listing.includes_bills) return false;
    if (filterStudentOnly && !listing.student_friendly) return false;
    return true;
  });

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Hero Section with London aerial background feel */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-black/40 z-10"></div>
        <div 
          className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=1920&q=80')] 
          bg-cover bg-center opacity-50"
        ></div>
        
        <div className="relative z-20 max-w-7xl mx-auto px-4 py-24 sm:py-32 text-center">
          <h1 className="text-4xl sm:text-6xl font-bold text-white mb-6">
            UniHome <span className="text-blue-300">UK</span>
          </h1>
          <p className="text-xl sm:text-2xl text-blue-100 mb-10 max-w-3xl mx-auto">
            优选英家 · AI赋能 · 英国留学生一站式租房平台
          </p>
          
          {/* Search Box */}
          <div className="max-w-2xl mx-auto relative">
            <div className="flex bg-white rounded-xl shadow-2xl overflow-hidden">
              <div className="pl-6 flex items-center">
                <Search className="w-6 h-6 text-gray-400" />
              </div>
              <Input
                placeholder="输入你的需求：LSE 步行圈 安静 带书桌..."
                className="flex-1 px-4 py-4 focus:outline-none text-lg border-0"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Button className="bg-blue-600 hover:bg-blue-700 px-8 text-white font-semibold rounded-none transition-colors">
                搜索
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Listing Section */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar Filters */}
          <Card className="md:w-64 flex-shrink-0 h-fit">
            <CardHeader>
              <CardTitle>筛选条件</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>价格区间 (镑/周)</Label>
                <div className="flex gap-2">
                  <Input type="number" placeholder="最低" className="w-1/2" />
                  <Input type="number" placeholder="最高" className="w-1/2" />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>卧室数量</Label>
                <div className="space-y-2">
                  {[1, 2, 3, '4+'].map((b) => (
                    <div key={b} className="flex items-center">
                      <Checkbox id={`bed-${b}`} />
                      <label htmlFor={`bed-${b}`} className="ml-2 text-sm">
                        {b}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>额外筛选</Label>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <Checkbox id="bills" />
                    <label htmlFor="bills" className="ml-2 text-sm">包所有bill</label>
                  </div>
                  <div className="flex items-center">
                    <Checkbox id="student" />
                    <label htmlFor="student" className="ml-2 text-sm">允许学生</label>
                  </div>
                  <div className="flex items-center">
                    <Checkbox id="tube" />
                    <label htmlFor="tube" className="ml-2 text-sm">近地铁</label>
                  </div>
                </div>
              </div>

              <Button className="w-full bg-blue-600 hover:bg-blue-700">
                应用筛选
              </Button>
            </CardContent>
          </Card>

          {/* Listing Grid */}
          <div className="flex-1 space-y-6">
            {sampleListings.map((listing) => (
              <Card key={listing.id} className="overflow-hidden">
                <div className="flex flex-col md:flex-row">
                  <div className="md:w-1/3 md:h-auto h-48 relative">
                    <img 
                      src={listing.imageUrl} 
                      alt={listing.title} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-3">
                      <h3 className="text-xl font-bold text-gray-900">{listing.title}</h3>
                      <div className="flex items-center text-green-600 font-bold">
                        <PoundSterling className="w-4 h-4 mr-1" />
                        <span className="text-xl">{listing.price}</span>
                        <span className="text-gray-500 ml-1">/{listing.priceUnit}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-gray-600 mb-3">
                      <div className="flex items-center">
                        <MapPin className="w-4 h-4 mr-1" />
                        <span className="text-sm">{listing.location}</span>
                      </div>
                      <div className="flex items-center">
                        <Bed className="w-4 h-4 mr-1" />
                        <span className="text-sm">{listing.beds}床</span>
                      </div>
                      <div className="flex items-center">
                        <Bath className="w-4 h-4 mr-1" />
                        <span className="text-sm">{listing.baths}卫</span>
                      </div>
                    </div>

                    <div className="flex gap-2 mb-4">
                      {listing.includesBills ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3 mr-1" />包bill
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          <XCircle className="w-3 h-3 mr-1" />不包bill
                        </span>
                      )}
                      {listing.studentFriendly && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          欢迎学生
                        </span>
                      )}
                    </div>

                    {/* AI Summary */}
                    <div className="bg-blue-50 rounded-lg p-4 mb-4">
                      <h4 className="text-sm font-semibold text-blue-800 mb-2 flex items-center">
                        🤖 AI 总结
                      </h4>
                      <p className="text-sm text-blue-900 whitespace-pre-line">{listing.aiSummary}</p>
                    </div>

                    <div className="flex gap-3">
                      <Button className="flex-1 bg-blue-600 hover:bg-blue-700">
                        AI 总结
                      </Button>
                      <Button className="flex-1 bg-green-600 hover:bg-green-700 flex items-center justify-center">
                        <MessageSquare className="w-4 h-4 mr-2" />
                        预约看房
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

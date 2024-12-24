import React, { useState, useEffect } from 'react';
import { Layout, Row, Col, Input, Select, Button, Card, Space, Typography, Tag, Divider } from 'antd';
import { SearchOutlined, AppstoreOutlined, TableOutlined, UnorderedListOutlined, MenuOutlined } from '@ant-design/icons';
import debounce from 'lodash/debounce';
import { useNavigate } from 'react-router-dom';

const { Content } = Layout;
const { Text, Title } = Typography;

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const POSTER_BASE_URL = 'https://image.tmdb.org/t/p/w500';

const Browse = () => {
  const [viewMode, setViewMode] = useState('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [filters, setFilters] = useState({
    genre: 'Any',
    year: 'Any',
    format: 'Any'
  });
  const [genres, setGenres] = useState([]);

  const navigate = useNavigate();

  const handleSelect = (value) => {
    const [type, id] = value.split("-"); // Split the prefix and ID
    if (type === "movie") {
      navigate(`/movie/${id}`); // Navigate to the movie detail page
    } else if (type === "tv") {
      navigate(`/tv/${id}`); // Navigate to the TV show detail page
    }
  };

  const fetchGenres = async () => {
    try {
      const [movieResponse, tvResponse] = await Promise.all([
        fetch(`${TMDB_BASE_URL}/genre/movie/list?api_key=${process.env.REACT_APP_TMDB_API_KEY}&language=en-US`),
        fetch(`${TMDB_BASE_URL}/genre/tv/list?api_key=${process.env.REACT_APP_TMDB_API_KEY}&language=en-US`)
      ]);
      
      const movieData = await movieResponse.json();
      const tvData = await tvResponse.json();
      
      const allGenres = [...movieData.genres, ...tvData.genres];
      const uniqueGenres = Array.from(new Map(allGenres.map(item => [item.id, item])).values());
      setGenres(uniqueGenres);
    } catch (error) {
      console.error('Error fetching genres:', error);
    }
  };

  const fetchContent = async (page = 1, shouldAppend = false) => {
    setLoading(true);
    try {
      let apiUrls = [];
      const genreFilter = filters.genre !== 'Any' ? `&with_genres=${filters.genre}` : '';
      const yearFilter = filters.year !== 'Any' ? `&primary_release_year=${filters.year}` : '';
      const tvYearFilter = filters.year !== 'Any' ? `&first_air_date_year=${filters.year}` : '';
      const pageParam = `&page=${page}`;

      if (searchQuery) {
        if (filters.format === 'Any' || filters.format === 'movie') {
          apiUrls.push(`${TMDB_BASE_URL}/search/movie?api_key=${process.env.REACT_APP_TMDB_API_KEY}&query=${encodeURIComponent(searchQuery)}${genreFilter}${yearFilter}${pageParam}`);
        }
        if (filters.format === 'Any' || filters.format === 'tv') {
          apiUrls.push(`${TMDB_BASE_URL}/search/tv?api_key=${process.env.REACT_APP_TMDB_API_KEY}&query=${encodeURIComponent(searchQuery)}${genreFilter}${tvYearFilter}${pageParam}`);
        }
      } else {
        if (filters.format === 'Any' || filters.format === 'movie') {
          apiUrls.push(`${TMDB_BASE_URL}/discover/movie?api_key=${process.env.REACT_APP_TMDB_API_KEY}${genreFilter}${yearFilter}${pageParam}&sort_by=popularity.desc`);
        }
        if (filters.format === 'Any' || filters.format === 'tv') {
          apiUrls.push(`${TMDB_BASE_URL}/discover/tv?api_key=${process.env.REACT_APP_TMDB_API_KEY}${genreFilter}${tvYearFilter}${pageParam}&sort_by=popularity.desc`);
        }
      }

      const responses = await Promise.all(apiUrls.map(url => fetch(url)));
      const data = await Promise.all(responses.map(response => response.json()));

      const formattedResults = data.flatMap(response => 
        response.results.map(item => ({
          ...item,
          media_type: item.first_air_date ? 'tv' : 'movie'
        }))
      );

      // Calculate max total pages from all responses
      const maxTotalPages = Math.max(...data.map(response => response.total_pages));
      setTotalPages(maxTotalPages);

      // Sort by popularity
      formattedResults.sort((a, b) => b.popularity - a.popularity);

      // Either append to existing results or set new results
      if (shouldAppend) {
        setResults(prevResults => [...prevResults, ...formattedResults]);
      } else {
        setResults(formattedResults);
      }
    } catch (error) {
      console.error('Fetch error:', error);
    }
    setLoading(false);
  };

  const handleLoadMore = () => {
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    fetchContent(nextPage, true);
  };

  const debouncedFetch = debounce((query) => {
    setCurrentPage(1);
    fetchContent(1, false);
  }, 500);

  useEffect(() => {
    fetchGenres();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    debouncedFetch(searchQuery);
    return () => debouncedFetch.cancel();
  }, [searchQuery, filters]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleRemoveFilter = (key) => {
    setFilters(prev => ({ ...prev, [key]: 'Any' }));
  };

  const handleRemoveSearch = () => {
    setSearchQuery('');
  };

  return (
    <Layout style={{ background: '#f5f5f5', minHeight: '100vh' }}>
      <Content style={{ padding: '24px', maxWidth: 1200, margin: '0 auto' }}>
        <Row gutter={[16, 16]}>
          {/* Title Section */}
          

          {/* Search and Filters */}
          <Col xs={24} sm={8} md={6} lg={6}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Text strong>Search</Text>
              <Input
                placeholder="Search titles..."
                prefix={<SearchOutlined />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%' }}
                allowClear
                loading={loading}
              />
            </div>
          </Col>

          <Col xs={24} sm={8} md={6} lg={6}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Text strong>Genre</Text>
              <Select
                style={{ width: '100%' }}
                value={filters.genre}
                onChange={(value) => handleFilterChange('genre', value)}
                placeholder="Select genre"
              >
                <Select.Option value="Any">All Genres</Select.Option>
                {genres.map((genre) => (
                  <Select.Option key={genre.id} value={genre.id.toString()}>
                    {genre.name}
                  </Select.Option>
                ))}
              </Select>
            </div>
          </Col>

          <Col xs={24} sm={8} md={6} lg={6}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Text strong>Release Year</Text>
              <Select
                style={{ width: '100%' }}
                value={filters.year}
                onChange={(value) => handleFilterChange('year', value)}
                placeholder="Select year"
              >
                <Select.Option value="Any">All Years</Select.Option>
                {Array.from({ length: 25 }, (_, i) => (
                  <Select.Option key={2024 - i} value={2024 - i}>
                    {2024 - i}
                  </Select.Option>
                ))}
              </Select>
            </div>
          </Col>

          <Col xs={24} sm={8} md={6} lg={6}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Text strong>Content Type</Text>
              <Select
                style={{ width: '100%' }}
                value={filters.format}
                onChange={(value) => handleFilterChange('format', value)}
                placeholder="Select type"
              >
                <Select.Option value="Any">All Types</Select.Option>
                <Select.Option value="movie">Movies</Select.Option>
                <Select.Option value="tv">TV Shows</Select.Option>
              </Select>
            </div>
          </Col>

          <Col xs={24}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Text strong>View Mode</Text>
              <Space>
                <Button
                  type={viewMode === 'grid' ? 'primary' : 'default'}
                  icon={<AppstoreOutlined />}
                  onClick={() => setViewMode('grid')}
                >
                  Grid
                </Button>
                <Button
                  type={viewMode === 'compact' ? 'primary' : 'default'}
                  icon={<TableOutlined />}
                  onClick={() => setViewMode('compact')}
                >
                  Compact
                </Button>
                <Button
                  type={viewMode === 'list' ? 'primary' : 'default'}
                  icon={<UnorderedListOutlined />}
                  onClick={() => setViewMode('list')}
                >
                  List
                </Button>
                <Button
                  type={viewMode === 'menu' ? 'primary' : 'default'}
                  icon={<MenuOutlined />}
                  onClick={() => setViewMode('menu')}
                >
                  Menu
                </Button>
              </Space>
            </div>
          </Col>
        </Row>

        {/* Active Filters */}
        <Row style={{ marginTop: 24, marginBottom: 24 }}>
          <Col span={24}>
            <Space size={[8, 16]} wrap>
              {searchQuery && (
                <Tag closable onClose={handleRemoveSearch}>
                  Search: {searchQuery}
                </Tag>
              )}
              {Object.entries(filters).map(([key, value]) => (
                value !== 'Any' && (
                  <Tag 
                    key={key} 
                    closable 
                    onClose={() => handleRemoveFilter(key)}
                  >
                    {key}: {value}
                  </Tag>
                )
              ))}
            </Space>
          </Col>
        </Row>

        {/* Results Count */}
        <Row style={{ marginBottom: 16 }}>
          <Col span={24}>
            <Text>Showing {results.length} results</Text>
          </Col>
        </Row>

        {/* Content Grid */}
        <Row gutter={[16, 16]}>
          {results.map((item) => (
            <Col 
              key={`${item.id}-${item.media_type}`}
              xs={12}
              sm={8}
              md={viewMode === 'grid' ? 6 : viewMode === 'compact' ? 4 : 24}
            >
              <Card
                hoverable
                loading={loading}
                onClick={() => handleSelect(`${item.media_type}-${item.id}`)}
                cover={
                  <div style={{ 
                    paddingTop: '150%', 
                    position: 'relative',
                    background: '#f0f0f0',
                    overflow: 'hidden'
                  }}>
                    <img
                      alt={item.title || item.name}
                      src={item.poster_path 
                        ? `${POSTER_BASE_URL}${item.poster_path}`
                        : '/api/placeholder/300/450'}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    />
                  </div>
                }
                bodyStyle={{ padding: '12px' }}
              >
                <Card.Meta
                  title={<Text style={{ fontSize: 14 }}>{item.title || item.name}</Text>}
                  description={
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {new Date(item.release_date || item.first_air_date).getFullYear()} • {item.media_type}
                    </Text>
                  }
                />
              </Card>
            </Col>
          ))}
        </Row>

        {/* Load More Button */}
        {results.length > 0 && currentPage < totalPages && (
          <Row justify="center" style={{ marginTop: 24 }}>
            <Col>
              <Button 
                type="primary"
                loading={loading}
                onClick={handleLoadMore}
              >
                Load More
              </Button>
            </Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
};

export default Browse;
import React, { useState, useEffect } from 'react';
import { Layout, Row, Col, Input, Select, Button, Card, Space, Typography, Tag } from 'antd';
import { SearchOutlined, AppstoreOutlined, TableOutlined } from '@ant-design/icons';
import debounce from 'lodash/debounce';
import { useNavigate } from 'react-router-dom';

const { Content } = Layout;
const { Text } = Typography;

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
    sort: 'popularity.desc',
    format: 'Any'
  });
  const [genres, setGenres] = useState([]);

  const navigate = useNavigate();

  const sortOptions = [
    { value: 'popularity.desc', label: 'Most Popular' },
    { value: 'top_rated', label: 'Top Rated' },
    { value: 'vote_count.desc', label: 'Most Reviewed' },
    { value: 'trending', label: 'Trending Now' },
    { value: 'revenue.desc', label: 'Highest Grossing' },
    { value: 'primary_release_date.desc', label: 'Recently Released' }
  ];

  const handleSelect = (value) => {
    const [type, id] = value.split("-");
    if (type === "movie") {
      navigate(`/movie/${id}`);
    } else if (type === "tv") {
      navigate(`/tv/${id}`);
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
      const pageParam = `&page=${page}`;
      
      if (searchQuery) {
        if (filters.format === 'Any' || filters.format === 'movie') {
          apiUrls.push(`${TMDB_BASE_URL}/search/movie?api_key=${process.env.REACT_APP_TMDB_API_KEY}&query=${encodeURIComponent(searchQuery)}${pageParam}`);
        }
        if (filters.format === 'Any' || filters.format === 'tv') {
          apiUrls.push(`${TMDB_BASE_URL}/search/tv?api_key=${process.env.REACT_APP_TMDB_API_KEY}&query=${encodeURIComponent(searchQuery)}${pageParam}`);
        }
      } else {
        // Handle different sort options
        switch (filters.sort) {
          case 'top_rated':
            // Use discover endpoint instead of top_rated for better filter support
            if (filters.format === 'Any' || filters.format === 'movie') {
              apiUrls.push(`${TMDB_BASE_URL}/discover/movie?api_key=${process.env.REACT_APP_TMDB_API_KEY}${genreFilter}${pageParam}&sort_by=vote_average.desc&vote_count.gte=200&vote_average.gte=7`);
            }
            if (filters.format === 'Any' || filters.format === 'tv') {
              apiUrls.push(`${TMDB_BASE_URL}/discover/tv?api_key=${process.env.REACT_APP_TMDB_API_KEY}${genreFilter}${pageParam}&sort_by=vote_average.desc&vote_count.gte=200&vote_average.gte=7`);
            }
            break;
            
          case 'trending':
            if (filters.format === 'Any' || filters.format === 'movie') {
              // For trending, we'll need to filter post-fetch since trending endpoint doesn't support genre filter
              apiUrls.push(`${TMDB_BASE_URL}/trending/movie/week?api_key=${process.env.REACT_APP_TMDB_API_KEY}${pageParam}`);
            }
            if (filters.format === 'Any' || filters.format === 'tv') {
              apiUrls.push(`${TMDB_BASE_URL}/trending/tv/week?api_key=${process.env.REACT_APP_TMDB_API_KEY}${pageParam}`);
            }
            break;
            
          default:
            const sortParam = `&sort_by=${filters.sort}`;
            if (filters.format === 'Any' || filters.format === 'movie') {
              apiUrls.push(`${TMDB_BASE_URL}/discover/movie?api_key=${process.env.REACT_APP_TMDB_API_KEY}${genreFilter}${sortParam}${pageParam}`);
            }
            if (filters.format === 'Any' || filters.format === 'tv') {
              apiUrls.push(`${TMDB_BASE_URL}/discover/tv?api_key=${process.env.REACT_APP_TMDB_API_KEY}${genreFilter}${sortParam}${pageParam}`);
            }
        }
      }
  
      const responses = await Promise.all(apiUrls.map(url => fetch(url)));
      const data = await Promise.all(responses.map(response => response.json()));
  
      let formattedResults = data.flatMap(response => 
        response.results.map(item => ({
          ...item,
          media_type: item.first_air_date ? 'tv' : 'movie',
          vote_average: Math.round(item.vote_average * 10) / 10
        }))
      );
  
      // Apply genre filtering for trending content post-fetch if needed
      if (filters.sort === 'trending' && filters.genre !== 'Any') {
        formattedResults = formattedResults.filter(item => 
          item.genre_ids && item.genre_ids.includes(parseInt(filters.genre))
        );
      }
  
      // Sort by vote average for top_rated content
      if (filters.sort === 'top_rated') {
        formattedResults.sort((a, b) => b.vote_average - a.vote_average);
      }
  
      const maxTotalPages = Math.max(...data.map(response => response.total_pages));
      setTotalPages(maxTotalPages);
  
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
    <Layout style={{ background: '#f4f4f9', minHeight: '100vh' }}>
      <Content style={{ padding: '24px', maxWidth: 1200, margin: '0 auto' }}>
      <Row gutter={[16, 16]}>
  {/* Search */}
  <Col xs={24} sm={12} md={4} lg={4}>
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

  {/* Genre */}
  <Col xs={24} sm={12} md={4} lg={4}>
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

  {/* Sort By */}
  <Col xs={24} sm={12} md={4} lg={4}>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <Text strong>Sort By</Text>
      <Select
        style={{ width: '100%' }}
        value={filters.sort}
        onChange={(value) => handleFilterChange('sort', value)}
        placeholder="Select sorting"
      >
        {sortOptions.map((option) => (
          <Select.Option key={option.value} value={option.value}>
            {option.label}
          </Select.Option>
        ))}
      </Select>
    </div>
  </Col>

  {/* Content Type */}
  <Col xs={24} sm={12} md={4} lg={4}>
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

  {/* View Mode */}
  <Col xs={24} sm={12} md={4} lg={4}>
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
                    {key === 'sort' 
                      ? `Sort: ${sortOptions.find(opt => opt.value === value)?.label}` 
                      : `${key}: ${value}`}
                  </Tag>
                )
              ))}
            </Space>
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
        <Space direction="vertical" size={0}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {new Date(item.release_date || item.first_air_date).getFullYear()} • {item.media_type}
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            ⭐ {item.vote_average} ({item.vote_count} votes)
          </Text>
        </Space>
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
import React from 'react';
import { Input } from "antd";

export const handleSearch = () => {
const [searchTerm, setSearchTerm] = useState('');
  return (
    <div>
      <Input placeholder="Basic usage"/>
    </div>
  )
}

export default handleSearch
import { useRef, useState } from 'react';
import { postItem } from '~/api';

interface Prop {
  onListingCompleted: () => void;
}

type FormDataType = {
  name: string;
  category: string;
  image: string | File;
};

export const Listing = ({ onListingCompleted }: Prop) => {
  const initialState = {
    name: '',
    category: '',
    image: '',
  };
  const [values, setValues] = useState<FormDataType>(initialState);

  const uploadImageRef = useRef<HTMLInputElement>(null);

  const onValueChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setValues({
      ...values,
      [event.target.name]: event.target.value,
    });
  };

  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setValues({
      ...values,
      [event.target.name]: event.target.files![0],
    });
  };

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // Validate field before submit
    const REQUIRED_FILEDS = ['name', 'image'];
    const missingFields = Object.entries(values)
      .filter(([, value]) => !value && REQUIRED_FILEDS.includes(value))
      .map(([key]) => key);

    if (missingFields.length) {
      alert(`Missing fields: ${missingFields.join(', ')}`);
      return;
    }

    // Submit the form using FormData
    const formData = new FormData();
    formData.append("name", values.name);
    formData.append("category", values.category);
    formData.append("image", values.image); // Ensure this is a File object

    fetch(`${import.meta.env.VITE_BACKEND_URL}/items`, {
      method: "POST",
      body: formData,
    })
      .then((res) => res.json())
      .then(() => {
        alert('Item listed successfully');
        onListingCompleted();
      })
      .catch((error) => {
        console.error('POST error:', error);
        alert('Failed to list this item');
      })
      .finally(() => {
        setValues(initialState);
        if (uploadImageRef.current) {
          uploadImageRef.current.value = '';
        }
      });
  };

  return (
    <div className="Listing">
      <form onSubmit={onSubmit}>
        <div>
          <input
            type="text"
            name="name"
            id="name"
            placeholder="name"
            onChange={onValueChange}
            required
            value={values.name}
          />
          <input
            type="text"
            name="category"
            id="category"
            placeholder="category"
            onChange={onValueChange}
            value={values.category}
          />
          <input
            type="file"
            name="image"
            id="image"
            onChange={onFileChange}
            required
            ref={uploadImageRef}
          />
          <button type="submit">List this item</button>
        </div>
      </form>
    </div>
  );
};

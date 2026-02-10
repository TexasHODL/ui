const CheckboxList: React.FC = () => {
    return (
        <div className="left-0 text-white p-4 rounded">
            <label className="flex items-center mb-2">
                <input type="checkbox" className="form-checkbox h-4 w-4 text-blue-500 border-gray-600 rounded focus:ring-0" />
                <span className="ml-2 text-sm">Sit out next hand</span>
            </label>
            <label className="flex items-center">
                <input type="checkbox" className="form-checkbox h-4 w-4 text-blue-500 border-gray-600 rounded focus:ring-0" />
                <span className="ml-2 text-sm">Sit out next big blind</span>
            </label>
        </div>
    );
};

export default CheckboxList;

using Sitecore.ContentSearch;
using Sitecore.ContentSearch.SearchTypes;
using System;

namespace Demo.Feature.NewsListing.Models
{
	public class NewsSearchResult : SearchResultItem
	{
		[IndexField("PublishDate")]
		public DateTime PublishDate
		{
			get;
			set;
		}

		[IndexField("Title")]
		public string Title { get; set; }

		[IndexField("Description")]
		public string Description { get; set; }

		[IndexField("Category")]
		public string Category { get; set; }

		[IndexField("IsActive")]
		public bool IsActive { get; set; }
	}
}
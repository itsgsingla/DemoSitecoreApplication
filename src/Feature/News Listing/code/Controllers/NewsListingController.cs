using Demo.Feature.NewsListing.Models;
using Demo.Foundation.ORM.Models;
using Glass.Mapper.Sc;
using Sitecore.Configuration;
using Sitecore.ContentSearch;
using Sitecore.ContentSearch.Linq;
using Sitecore.ContentSearch.Linq.Utilities;
using Sitecore.Data;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using System.Web;
using System.Web.Mvc;

namespace Demo.Feature.NewsListing.Controllers
{
	public class NewsListingController: Controller
	{

		/// <summary>
		/// Returns all the news articles based on index types
		/// </summary>
		/// <returns></returns>
		public ActionResult NewsListing()
		{
			string indexName = Settings.GetSetting("Demo.Search.Index.Default");
			var searchIndex = ContentSearchManager.GetIndex(indexName);
			using (var context = searchIndex.CreateSearchContext())
			{
				var query = context.GetQueryable<NewsSearchResult>()
					.Where(i => i.TemplateId == ID.Parse(TemplateIdConstants.NewsConstants.TemplateId))
					.Where(i => i.Path.Contains("/sitecore/content"));
					//.Where(i => i.ContextLanguage == Sitecore.Context.Language.Name);

				//query = query.Page(0, newsToDisplay);
				query = query.OrderByDescending(i => i.PublishDate);
				var results = query.GetResults();
				var sitecoreService = new SitecoreService(Sitecore.Context.Database);
				var newsArticles = results.Hits.Select(hit => hit.Document.GetItem()).Select(i => sitecoreService.GetItem<INews>(i.ID.Guid)).ToList();
				return View(newsArticles);
			}
		}

		/// <summary>
		/// Returns results based on the filters for category and publish date
		/// </summary>
		/// <param name="category"></param>
		/// <param name="publishDate"></param>
		/// <returns></returns>
		public ActionResult NewsListingFilter(string category, string publishDate)
		{
			//string indexName = Settings.GetSetting("Demo.Search.Index.Default");
			string indexName = "sitecore_master_index";
			var searchIndex = ContentSearchManager.GetIndex(indexName);
			using (var context = searchIndex.CreateSearchContext())
			{
				var newsPredicate = GetNewsPredicate(category, publishDate);
				var query = context.GetQueryable<NewsSearchResult>()
					.Where(i => i.TemplateId == ID.Parse(TemplateIdConstants.NewsConstants.TemplateId))
					.Where(newsPredicate)
					.Where(i => i.Path.Contains("/sitecore/content"));
				//.Where(i => i.ContextLanguage == Sitecore.Context.Language.Name);

				//query = query.Page(0, newsToDisplay);
				query = query.OrderByDescending(i => i.PublishDate);
				var results = query.GetResults();
				var sitecoreService = new SitecoreService(Sitecore.Context.Database);
				var newsArticles = results.Hits.Select(hit => hit.Document.GetItem()).Select(i => sitecoreService.GetItem<INews>(i.ID.Guid)).ToList();
				return View(newsArticles);
			}
		}

		public static Expression<Func<NewsSearchResult, bool>> GetNewsPredicate(string category, string publishDateStr)
		{
			Expression<Func<NewsSearchResult, bool>> predicate = PredicateBuilder.True<NewsSearchResult>();

			if (!string.IsNullOrEmpty(category))
			{
				predicate = predicate.And(c => c.Category.Equals(category));
			}
			if (!string.IsNullOrEmpty(publishDateStr))
			{
				var publishDate = DateTime.Parse(publishDateStr);
				predicate = predicate.And(c => c.PublishDate == publishDate);
			}

			return predicate;
		}
	}
}